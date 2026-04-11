import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/rbac';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const profile = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError }, { status: 401 });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        id: user.id,
        email: user.email,
        metadata_role: user.app_metadata?.role || user.user_metadata?.role,
        raw_metadata: user.user_metadata,
      },
      database_profile: {
        id: profile?.id,
        email: profile?.email,
        role: profile?.role,
        tenant_id: profile?.tenant_id,
        full_name: profile?.full_name,
      },
      status: {
        is_synced: (user.user_metadata?.role === profile?.role),
        is_superadmin: profile?.role === 'superadmin',
        is_warden: profile?.role === 'warden',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
