import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

const linkSchema = z.object({
  student_id: z.string().uuid("Invalid student ID format"),
});

export async function POST(request: Request) {
  try {
    const parentProfile = await requireRole('parent');
    
    // Rate limit
    const limit = await checkRateLimit(`parent_link_${parentProfile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const body = await request.json();
    const result = linkSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid invitation or student ID format', details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    const { student_id } = result.data;
    const supabase = createAdminClient();

    // 1. Verify student exists and is actually a student
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, parent_id')
      .eq('id', student_id)
      .eq('role', 'student')
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found. Please verify the link code.' }, 
        { status: 404, headers: getRateLimitHeaders(limit) }
      );
    }

    // 2. Check if student is already linked to someone else
    if (student.parent_id) {
      return NextResponse.json({ 
        error: 'This student is already linked to another parent account.' 
      }, { status: 400, headers: getRateLimitHeaders(limit) });
    }

    // 3. Perform the link
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ parent_id: parentProfile.id })
      .eq('id', student_id);

    if (updateError) {
      console.error('[Parent Link] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to link account' }, 
        { status: 500, headers: getRateLimitHeaders(limit) }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully linked with ${student.full_name}` 
    }, { headers: getRateLimitHeaders(limit) });

  } catch (error) {
    console.error('[Parent Link] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}
