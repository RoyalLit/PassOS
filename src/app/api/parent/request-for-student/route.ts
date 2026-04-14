import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRequestSchema } from '@/lib/validators/request-schema';
import { MAX_REQUESTS_PER_DAY } from '@/lib/constants';
import { isWithinCampus } from '@/lib/geo/campus-boundary';

function sanitizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Internal server error';
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: parentProfile } = await admin
      .from('profiles')
      .select('id, role, full_name, email, tenant_id')
      .eq('id', user.id)
      .single();

    if (!parentProfile || parentProfile.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: linkedStudent } = await admin
      .from('profiles')
      .select('id, full_name, email, hostel, room_number, tenant_id')
      .eq('parent_id', user.id)
      .single();

    if (!linkedStudent) {
      return NextResponse.json(
        { error: 'No linked student found. Please link with your ward first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = createRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check "one active request" rule for the student (not the parent)
    const [
      { data: pendingRequests, error: pendingError },
      { data: activePasses, error: passError },
    ] = await Promise.all([
      admin
        .from('pass_requests')
        .select('id')
        .eq('student_id', linkedStudent.id)
        .in('status', ['pending', 'parent_pending', 'parent_approved', 'admin_pending'])
        .limit(1),
      admin
        .from('passes')
        .select('id')
        .eq('student_id', linkedStudent.id)
        .in('status', ['active', 'used_exit'])
        .limit(1),
    ]);

    if (pendingError) throw new Error('Failed to check pending requests');
    if (passError) throw new Error('Failed to check active passes');

    if (
      (pendingRequests && pendingRequests.length > 0) ||
      (activePasses && activePasses.length > 0)
    ) {
      return NextResponse.json(
        {
          error: `${linkedStudent.full_name} already has an active pass or a pending request. Please complete or cancel it before requesting a new one.`,
        },
        { status: 429 }
      );
    }

    // Day Outing Same-Day Validation
    if (data.request_type === 'day_outing') {
      const depDate = new Date(data.departure_at).toLocaleDateString('en-GB');
      const retDate = new Date(data.return_by).toLocaleDateString('en-GB');
      if (depDate !== retDate) {
        return NextResponse.json(
          { error: 'Day outings must be completed within the same day. Please use "Overnight" for multi-day stays.' },
          { status: 400 }
        );
      }
    }

    // Rate limiting for the student (not the parent)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount, error: rateError } = await admin
      .from('pass_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', linkedStudent.id)
      .gte('created_at', oneDayAgo);

    if (rateError) throw new Error('Failed to check request limits');

    if ((dailyCount ?? 0) >= MAX_REQUESTS_PER_DAY) {
      return NextResponse.json(
        {
          error: `${linkedStudent.full_name} has reached the daily limit of ${MAX_REQUESTS_PER_DAY} requests. Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    // Calculate geo_valid server-side
    const geo_valid =
      data.geo_lat !== undefined && data.geo_lng !== undefined
        ? isWithinCampus(data.geo_lat, data.geo_lng)
        : false;

    // Parent is the requester — bypass parent_approval_mode, go directly to admin_pending
    const { data: insertedRequest, error: insertError } = await admin
      .from('pass_requests')
      .insert({
        student_id: linkedStudent.id,
        tenant_id: linkedStudent.tenant_id,
        request_type: data.request_type,
        reason: `[Parent-initiated] ${data.reason}`,
        destination: data.destination,
        departure_at: data.departure_at,
        return_by: data.return_by,
        proof_urls: data.proof_urls,
        geo_lat: data.geo_lat,
        geo_lng: data.geo_lng,
        geo_valid,
        status: 'admin_pending',
        metadata: {
          requested_by_parent_id: user.id,
          requested_by_parent_name: parentProfile.full_name,
        },
      })
      .select()
      .single();

    if (insertError) throw new Error('Failed to create request');

    // Create audit log entry
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      tenant_id: linkedStudent.tenant_id,
      action: 'parent_request_for_student',
      entity_type: 'pass_request',
      entity_id: insertedRequest.id,
      new_data: {
        student_id: linkedStudent.id,
        student_name: linkedStudent.full_name,
        request_type: data.request_type,
        reason: data.reason,
        requested_by_parent: parentProfile.full_name,
      },
    });

    return NextResponse.json({ data: insertedRequest }, { status: 201 });
  } catch (error: unknown) {
    console.error('Parent request-for-student error:', error);
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    );
  }
}
