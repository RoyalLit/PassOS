import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Confirm caller is a parent
    const { data: parentProfile } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!parentProfile || parentProfile.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { request_id, decision, reason } = body;

    if (!request_id || !decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verify this request belongs to the parent's linked student
    const { data: student } = await admin
      .from('profiles')
      .select('id')
      .eq('parent_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'No linked student found' }, { status: 404 });
    }

    const { data: passReq } = await admin
      .from('pass_requests')
      .select('id, student_id, status')
      .eq('id', request_id)
      .single();

    if (!passReq || passReq.student_id !== student.id) {
      return NextResponse.json({ error: 'Request not found or not linked to your student' }, { status: 404 });
    }

    if (!['parent_pending', 'ai_review', 'pending'].includes(passReq.status)) {
      return NextResponse.json({ error: 'Request is not awaiting parent approval' }, { status: 400 });
    }

    // Record the parent approval
    await admin.from('approvals').insert({
      request_id,
      approver_id: user.id,
      approver_type: 'parent',
      decision,
      reason: reason || null,
      ip_address: request.headers.get('x-forwarded-for'),
    });

    // Advance the request status
    const nextStatus = decision === 'approved' ? 'admin_pending' : 'parent_rejected';
    await admin
      .from('pass_requests')
      .update({ status: nextStatus })
      .eq('id', request_id);

    return NextResponse.json({ success: true, next_status: nextStatus });
  } catch (error: any) {
    console.error('Parent decide error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
