import { NextResponse } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/Analytics] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.',
        code: 'MISSING_ENV_VAR'
      }, { status: 500 });
    }

    await validateSuperAdminServer();
    const admin = createAdminClient();

    const [tenantsRes, profilesRes, passesRes, requestsRes, fraudFlagsRes] = await Promise.all([
      admin.from('tenants').select('id, status, plan, created_at'),
      admin.from('profiles').select('id, role, created_at'),
      admin.from('passes').select('id, status, created_at'),
      admin.from('pass_requests').select('id, status, created_at'),
      admin.from('fraud_flags').select('id, created_at'),
    ]);

    return NextResponse.json({
      tenants: tenantsRes.data || [],
      profiles: profilesRes.data || [],
      passes: passesRes.data || [],
      requests: requestsRes.data || [],
      fraudFlags: fraudFlagsRes.data || [],
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status });
  }
}
