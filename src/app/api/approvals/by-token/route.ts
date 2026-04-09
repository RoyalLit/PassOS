import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyApprovalToken } from '@/lib/crypto/approval-tokens';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Verify token exists and hasn't been used
    const payload = await verifyApprovalToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    // Look up the associated approval record
    const { data: approval } = await supabase
      .from('approvals')
      .select('id, decision, token_expires, request_id')
      .eq('token', token)
      .single();

    if (!approval) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (approval.decision !== 'escalated') {
      return NextResponse.json(
        { error: `This link has already been used. Decision: ${approval.decision}` },
        { status: 400 }
      );
    }

    if (approval.token_expires && new Date(approval.token_expires) < new Date()) {
      return NextResponse.json({ error: 'This approval link has expired' }, { status: 403 });
    }

    // Fetch the full request + student details
    const { data: passReq } = await supabase
      .from('pass_requests')
      .select(`
        id,
        request_type,
        reason,
        destination,
        departure_at,
        return_by,
        student:profiles!student_id (
          id,
          full_name,
          hostel,
          room_number
        )
      `)
      .eq('id', approval.request_id)
      .single();

    if (!passReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // profiles!student_id returns an array, grab the first element
    const student = Array.isArray(passReq.student) ? passReq.student[0] : passReq.student;

    return NextResponse.json({
      request_id: passReq.id,
      student_name: student?.full_name ?? 'Unknown',
      student_hostel: student?.hostel ?? null,
      student_room: student?.room_number ?? null,
      request_type: passReq.request_type,
      destination: passReq.destination,
      reason: passReq.reason,
      departure_at: passReq.departure_at,
      return_by: passReq.return_by,
    });
  } catch (error) {
    console.error('Token lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
