import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireRole('student');
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Verify the request exists, belongs to the student, and is in a cancellable state
    const { data: passReq, error: fetchError } = await supabase
      .from('pass_requests')
      .select('id, status, student_id')
      .eq('id', id)
      .single();

    if (fetchError || !passReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (passReq.student_id !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized to cancel this request' }, { status: 403 });
    }

    // Only pending states can be cancelled
    if (!['pending', 'parent_pending', 'admin_pending'].includes(passReq.status)) {
      return NextResponse.json(
        { error: 'This request can no longer be cancelled because it has already been processed.' },
        { status: 400 }
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
      throw updateError;
    }

    return NextResponse.json({ success: true, data: updatedReq });
  } catch (error: unknown) {
    console.error('Cancel request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
