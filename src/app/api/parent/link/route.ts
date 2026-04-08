import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const parentProfile = await requireRole('parent');
    const { student_id } = await request.json();

    if (!student_id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verify student exists and is actually a student
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, parent_id')
      .eq('id', student_id)
      .eq('role', 'student')
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found with the provided ID' }, { status: 404 });
    }

    // 2. Check if student is already linked to someone else
    if (student.parent_id) {
      return NextResponse.json({ 
        error: 'This student is already linked to another parent account. Please contact administration for changes.' 
      }, { status: 400 });
    }

    // 3. Perform the link
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ parent_id: parentProfile.id })
      .eq('id', student_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully linked with ${student.full_name}` 
    });

  } catch (error) {
    console.error('Linking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
