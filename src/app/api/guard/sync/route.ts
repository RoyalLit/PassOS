import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await requireRole('guard');
    const supabase = createAdminClient();

    // Fetch passes that are currently actionable (active for exit, used_exit/expired for entry)
    // We only need the payload to map pass_id -> student details offline.
    const { data: passes, error } = await supabase
      .from('passes')
      .select(`
        id,
        status,
        qr_payload,
        valid_from,
        valid_until,
        student_id,
        profiles!passes_student_id_fkey (
          full_name,
          enrollment_number,
          avatar_url,
          hostel,
          room_number
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['active', 'used_exit', 'expired', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1000); // Reasonable cache limit for an offline sync

    if (error) {
      console.error('Guard sync fetch error:', error);
      return NextResponse.json({ 
        error: 'Failed to sync passes', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, passes });
  } catch (error: any) {
    console.error('Guard sync auth error:', error);
    return NextResponse.json({ 
      error: 'Unauthorized or invalid session',
      details: error.message
    }, { status: 401 });
  }
}
