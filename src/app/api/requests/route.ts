import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRequestSchema } from '@/lib/validators/request-schema';
import { MAX_REQUESTS_PER_DAY } from '@/lib/constants';
import { isWithinCampus } from '@/lib/geo/campus-boundary';
import type { ParentApprovalMode } from '@/lib/actions/settings';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const profile = await requireRole('student');
    
    // HTTP Rate Limit check
    const limit = await checkRateLimit(`request_create_${profile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const supabase = await createServerSupabaseClient();
    
    // Parse and validate input
    const body = await request.json();
    const result = createRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() }, 
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    const data = result.data;
    const isExtension = body.extension_of !== undefined && body.extension_of !== null;

    // 2. One Active Request Rule
    if (!isExtension) {
      if (new Date(data.departure_at) < new Date()) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: { departure_at: ['Departure must be in the future'] } 
        }, { status: 400, headers: getRateLimitHeaders(limit) });
      }

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

      if (pendingError || passError) {
        console.error('[Pass Request] Check failed:', pendingError || passError);
        return NextResponse.json({ error: 'Failed to verify existing pass status' }, { status: 500 });
      }

      if ((pendingRequests && pendingRequests.length > 0) || (activePasses && activePasses.length > 0)) {
        return NextResponse.json({ 
          error: "You already have an active pass or a pending request." 
        }, { status: 429, headers: getRateLimitHeaders(limit) });
      }
    }

    // 3. Day Outing Same-Day Validation
    if (data.request_type === 'day_outing') {
      const depDate = new Date(data.departure_at).toLocaleDateString('en-GB');
      const retDate = new Date(data.return_by).toLocaleDateString('en-GB');
      if (depDate !== retDate) {
        return NextResponse.json({ 
          error: 'Day outings must be completed within the same day.' 
        }, { status: 400, headers: getRateLimitHeaders(limit) });
      }
    }

    // 3. Rate Limiting — enforce MAX_REQUESTS_PER_DAY
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount, error: rateError } = await supabase
      .from('pass_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', profile.id)
      .gte('created_at', oneDayAgo);

    if (rateError) {
      console.error('[Pass Request] Daily count error:', rateError);
      return NextResponse.json({ error: 'Failed to verify daily request limit' }, { status: 500 });
    }

    if ((dailyCount ?? 0) >= MAX_REQUESTS_PER_DAY) {
      return NextResponse.json({
        error: `You have reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests.`,
      }, { status: 429, headers: getRateLimitHeaders(limit) });
    }

    // 4. Pass Time Limit Enforcement
    if (!isExtension) {
      const admin = createAdminClient();
      const { data: limits } = await admin
        .from('pass_time_limits')
        .select('*')
        .eq('pass_type', data.request_type)
        .eq('enabled', true)
        .or('tenant_id.is.null,tenant_id.eq.' + (profile.tenant_id || 'null'))
        .limit(1)
        .maybeSingle();

      if (limits) {
        const departureDate = new Date(data.departure_at);
        const returnDate = new Date(data.return_by);

        if (limits.allowed_start && limits.allowed_end) {
          const depHHMM = departureDate.toTimeString().slice(0, 5);
          if (depHHMM < limits.allowed_start || depHHMM > limits.allowed_end) {
            return NextResponse.json({
              error: `Departure must be between ${limits.allowed_start} and ${limits.allowed_end}.`,
            }, { status: 400, headers: getRateLimitHeaders(limit) });
          }
        }

        if (limits.max_duration_hours) {
          const durationHours = (returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60);
          if (durationHours > limits.max_duration_hours) {
            return NextResponse.json({
              error: `Maximum allowed duration for this pass is ${limits.max_duration_hours} hours.`,
            }, { status: 400, headers: getRateLimitHeaders(limit) });
          }
        }
      }
    }

    const geo_valid = data.geo_lat !== undefined && data.geo_lng !== undefined
      ? isWithinCampus(data.geo_lat, data.geo_lng)
      : false;

    let initialStatus: string;
    const adminClient = createAdminClient();
    const { data: settings } = await adminClient
      .from('app_settings')
      .select('parent_approval_mode')
      .single();
    const mode: ParentApprovalMode = settings?.parent_approval_mode ?? 'smart';

    if (mode === 'none') {
      initialStatus = 'admin_pending';
    } else if (mode === 'all') {
      initialStatus = 'parent_pending';
    } else {
      const requiresParent = ['overnight', 'emergency', 'medical'].includes(data.request_type);
      initialStatus = requiresParent ? 'parent_pending' : 'admin_pending';
    }

    const { data: insertedRequest, error: insertError } = await supabase
      .from('pass_requests')
      .insert({
        student_id: profile.id,
        tenant_id: profile.tenant_id,
        request_type: data.request_type,
        reason: data.reason,
        destination: data.destination,
        departure_at: data.departure_at,
        return_by: data.return_by,
        proof_urls: data.proof_urls,
        geo_lat: data.geo_lat,
        geo_lng: data.geo_lng,
        geo_valid,
        status: initialStatus,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Pass Request] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create pass request' }, { status: 500 });
    }

    return NextResponse.json({ data: insertedRequest }, { 
      status: 201, 
      headers: getRateLimitHeaders(limit) 
    });
  } catch (error: unknown) {
    console.error('[Pass Request] Internal critical error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred' },
      { status: 500 }
    );
  }
}

