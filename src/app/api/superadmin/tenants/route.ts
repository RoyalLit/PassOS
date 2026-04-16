import { NextResponse } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/Tenants] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.',
        code: 'MISSING_ENV_VAR'
      }, { status: 500 });
    }

    await validateSuperAdminServer();
    const admin = createAdminClient();

    const { data: tenants, error } = await admin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/Superadmin/Tenants] Fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenants });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status });
  }
}
