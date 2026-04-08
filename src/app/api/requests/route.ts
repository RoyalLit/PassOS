import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createRequestSchema } from '@/lib/validators/request-schema';
import { MAX_REQUESTS_PER_DAY } from '@/lib/constants';
import { isWithinCampus } from '@/lib/geo/campus-boundary';

function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Internal server error';
}

export async function POST(request: Request) {
  try {
    const profile = await requireRole('student');
    const supabase = await createServerSupabaseClient();
    
    // Parse and validate input
    const body = await request.json();
    const result = createRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;
    const isExtension = body.extension_of !== undefined && body.extension_of !== null;

    // 2. One Active Request Rule
    if (!isExtension) {
      // Run both checks in parallel — cuts 2 sequential round-trips down to 1
      const [
        { data: pendingRequests, error: pendingError },
        { data: activePasses,   error: passError },
      ] = await Promise.all([
        supabase
          .from('pass_requests')
          .select('id')
          .eq('student_id', profile.id)
          .in('status', ['pending', 'parent_pending', 'parent_approved', 'admin_pending'])
          .limit(1),
        supabase
          .from('passes')
          .select('id')
          .eq('student_id', profile.id)
          .in('status', ['active', 'used_exit'])
          .limit(1),
      ]);

      if (pendingError) throw new Error('Pending Check Failed: ' + JSON.stringify(pendingError));
      if (passError)    throw new Error('Pass Check Failed: '    + JSON.stringify(passError));

      if ((pendingRequests && pendingRequests.length > 0) || (activePasses && activePasses.length > 0)) {
        return NextResponse.json({ 
          error: "You already have an active pass or a pending request. Please complete or cancel it before requesting a new one." 
        }, { status: 429 });
      }
    }

    // 3. Day Outing Same-Day Validation
    if (data.request_type === 'day_outing') {
      const depDate = new Date(data.departure_at).toLocaleDateString('en-GB');
      const retDate = new Date(data.return_by).toLocaleDateString('en-GB');
      if (depDate !== retDate) {
        return NextResponse.json({ error: 'Day outings must be completed within the same day. Please use "Overnight" for multi-day stays.' }, { status: 400 });
      }
    }

    // 3. Rate Limiting — enforce MAX_REQUESTS_PER_DAY (defined in constants.ts)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount, error: rateError } = await supabase
      .from('pass_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', profile.id)
      .gte('created_at', oneDayAgo);

    if (rateError) throw new Error('Rate limit check failed: ' + JSON.stringify(rateError));

    if ((dailyCount ?? 0) >= MAX_REQUESTS_PER_DAY) {
      return NextResponse.json({
        error: `You have reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again tomorrow.`,
      }, { status: 429 });
    }

    // Calculate geo_valid server-side to prevent client spoofing
    const geo_valid = data.geo_lat !== undefined && data.geo_lng !== undefined 
      ? isWithinCampus(data.geo_lat, data.geo_lng)
      : false;
    
    const initialStatus = 'pending';

    const { data: insertedRequest, error: insertError } = await supabase
      .from('pass_requests')
      .insert({
        student_id: profile.id,
        request_type: data.request_type,
        reason: data.reason,
        destination: data.destination,
        departure_at: data.departure_at,
        return_by: data.return_by,
        proof_urls: data.proof_urls,
        geo_lat: data.geo_lat,
        geo_lng: data.geo_lng,
        geo_valid, // Use server-side calculated value
        status: initialStatus,
      })
      .select()
      .single();

    if (insertError) throw new Error('Insert Failed: ' + JSON.stringify(insertError));


    return NextResponse.json({ data: insertedRequest }, { status: 201 });
  } catch (error: unknown) {
    console.error('Request creation error:', error);
    const status = error instanceof Error && 
      (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) 
      ? 403 
      : 500;
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status }
    );
  }
}
