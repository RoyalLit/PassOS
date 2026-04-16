import { NextResponse } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/Dashboard] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.',
        code: 'MISSING_ENV_VAR'
      }, { status: 500 });
    }

    await validateSuperAdminServer();
    const admin = createAdminClient();

    const [tenantsAll, profilesSummary, tenantsRecent] = await Promise.all([
      admin.from('tenants').select('id, status, plan'),
      admin.from('profiles').select('id, role, tenant_id'),
      admin.from('tenants').select('id, name, slug, status, plan, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    return NextResponse.json({
      tenants: tenantsAll.data || [],
      profiles: profilesSummary.data || [],
      recentTenants: tenantsRecent.data || [],
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status });
  }
}
