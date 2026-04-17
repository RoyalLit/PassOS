import { NextResponse } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantSchema } from '@/lib/validators/tenant-schema';

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

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/Tenants] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.',
        code: 'MISSING_ENV_VAR'
      }, { status: 500 });
    }

    const { user } = await validateSuperAdminServer();
    const admin = createAdminClient();
    const body = await request.json();
    
    const result = createTenantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const { name, slug, status, plan, domains, settings } = result.data;

    const { data: tenant, error } = await admin
      .from('tenants')
      .insert({
        name,
        slug,
        status,
        plan,
        domains: domains || [],
        settings: settings || {}
      })
      .select()
      .single();

    if (error) {
      console.error('[Superadmin Tenants POST] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record Audit Log
    const { recordAuditLog } = await import('@/lib/audit');
    await recordAuditLog({
      actorId: user.id,
      action: 'create_tenant',
      entityType: 'tenant',
      entityId: tenant.id,
      newData: tenant
    });

    return NextResponse.json({ tenant });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status });
  }
}
