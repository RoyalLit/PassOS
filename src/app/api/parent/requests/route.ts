import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Get the parent's profile to confirm role
    const { data: parentProfile } = await admin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single();

    if (!parentProfile || parentProfile.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the student whose parent_id points to this parent
    const { data: student } = await admin
      .from('profiles')
      .select('id, full_name, email, hostel, room_number, avatar_url')
      .eq('parent_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ student: null, requests: [], studentState: null, activePass: null, recentPasses: [] });
    }

    // Fetch all data in parallel
    const [requestsRes, studentStateRes, recentPassesRes] = await Promise.all([
      // All pass requests for the student
      admin
        .from('pass_requests')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(20),

      // Student's current campus state
      admin
        .from('student_states')
        .select('current_state, active_pass_id, last_exit, last_entry, updated_at')
        .eq('student_id', student.id)
        .single(),

      // Recent passes with their request data (for the timeline)
      admin
        .from('passes')
        .select('id, status, valid_from, valid_until, exit_at, entry_at, created_at, request:pass_requests!request_id(request_type, destination, reason, departure_at, return_by)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Find the active pass (if any)
    const activePass = recentPassesRes.data?.find(p => p.status === 'active' || p.status === 'used_exit') ?? null;

    return NextResponse.json({
      student,
      requests: requestsRes.data || [],
      studentState: studentStateRes.data ?? null,
      activePass,
      recentPasses: recentPassesRes.data || [],
    });
  } catch (error) {
    console.error('Parent requests error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
