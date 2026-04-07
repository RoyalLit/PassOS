import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createRequestSchema } from '@/lib/validators/request-schema';
import { MAX_REQUESTS_PER_DAY } from '@/lib/constants';

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
      // a) Check for requests still in the approval pipeline
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('pass_requests')
        .select('id')
        .eq('student_id', profile.id)
        .in('status', ['pending', 'ai_review', 'parent_pending', 'parent_approved', 'admin_pending'])
        .limit(1);

      if (pendingError) throw new Error('Pending Check Failed: ' + JSON.stringify(pendingError));
      
      // b) Check for passes currently active or haven't returned yet
      const { data: activePasses, error: passError } = await supabase
        .from('passes')
        .select('id')
        .eq('student_id', profile.id)
        .in('status', ['active', 'used_exit'])
        .limit(1);

      if (passError) throw new Error('Pass Check Failed: ' + JSON.stringify(passError));

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

    // 3. Rate limiting check (Daily Max)

    let initialStatus = 'ai_review';

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
        geo_valid: body.geo_valid,
        status: initialStatus,
      })
      .select()
      .single();

    if (insertError) throw new Error('Insert Failed: ' + JSON.stringify(insertError));

    // Fire off async webhook for AI analysis
    // In production, you would probably hit a background queue here.
    // For now, we trigger the endpoint without waiting.
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: insertedRequest.id }),
    }).catch(e => console.error('Failed to trigger AI review:', e));

    return NextResponse.json({ data: insertedRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Request creation error:', error);
    return NextResponse.json(
      { 
        error: error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || 'Internal server error',
        details: error 
      },
      { status: error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
