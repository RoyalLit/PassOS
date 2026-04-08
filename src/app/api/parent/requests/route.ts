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
      return NextResponse.json({ student: null, requests: [] });
    }

    // Get all pass requests for that student, newest first
    const { data: requests } = await admin
      .from('pass_requests')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ student, requests: requests || [] });
  } catch (error) {
    console.error('Parent requests error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
