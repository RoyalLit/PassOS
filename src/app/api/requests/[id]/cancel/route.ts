import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireRole('student');
    const { id } = await params;
    
    // Rate limit
    const limit = await checkRateLimit(`request_cancel_${profile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const supabase = await createServerSupabaseClient();

    // Verify the request exists, belongs to the student, and is in a cancellable state
    const { data: passReq, error: fetchError } = await supabase
      .from('pass_requests')
      .select('id, status, student_id')
      .eq('id', id)
      .single();

    if (fetchError || !passReq) {
      console.error('[Cancel Request] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Request not found' }, 
        { status: 404, headers: getRateLimitHeaders(limit) }
      );
    }

    if (passReq.student_id !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden' }, 
        { status: 403, headers: getRateLimitHeaders(limit) }
      );
    }

    // Only pending states can be cancelled
    if (!['pending', 'parent_pending', 'admin_pending'].includes(passReq.status)) {
      return NextResponse.json(
        { error: 'This request can no longer be cancelled.' },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    // Update status to cancelled
    const { data: updatedReq, error: updateError } = await supabase
      .from('pass_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Cancel Request] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel request' }, 
        { status: 500, headers: getRateLimitHeaders(limit) }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedReq 
    }, { headers: getRateLimitHeaders(limit) });
  } catch (error: unknown) {
    console.error('[Cancel Request] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}
