import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export async function GET() {
  try {
    const parentProfile = await requireRole('parent');
    
    // Rate limit for basic data scraping protection
    const limit = await checkRateLimit(`parent_requests_get_${parentProfile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const admin = createAdminClient();

    // Find the student whose parent_id points to this parent
    const { data: student } = await admin
      .from('profiles')
      .select('id, full_name, email, hostel, room_number, avatar_url')
      .eq('parent_id', parentProfile.id)
      .single();

    if (!student) {
      return NextResponse.json({ 
        student: null, 
        requests: [], 
        studentState: null, 
        activePass: null, 
        recentPasses: [] 
      }, { headers: getRateLimitHeaders(limit) });
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
    }, { headers: getRateLimitHeaders(limit) });
  } catch (error) {
    console.error('[Parent Requests] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}
