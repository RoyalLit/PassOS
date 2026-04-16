import { NextResponse, type NextRequest } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/TenantDetail] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.',
        code: 'MISSING_ENV_VAR'
      }, { status: 500 });
    }

    await validateSuperAdminServer();
    const admin = createAdminClient();

    const [{ data: tenant, error: tErr }, { data: users, error: uErr }] = await Promise.all([
      admin.from('tenants').select('*').eq('id', id).single(),
      admin.from('profiles').select('*').eq('tenant_id', id).order('created_at', { ascending: false }),
    ]);

    if (tErr) {
      console.error('[API/Superadmin/TenantDetail] Tenant fetch error:', tErr.message);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
    if (uErr) {
      console.error('[API/Superadmin/TenantDetail] Users fetch error:', uErr.message);
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ tenant, users });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status });
  }
}
