import { NextResponse, type NextRequest } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantSchema, updateTenantSchema } from '@/lib/validators/tenant-schema';

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
      admin.from('tenants').select('id, name, slug, domains, logo_url, brand_primary, brand_secondary, status, plan, settings, created_by, created_at, updated_at').eq('id', id).single(),
      admin.from('profiles').select('id, full_name, email, avatar_url, role, hostel, room_number, enrollment_number, tenant_id, is_active, phone, created_at').eq('tenant_id', id).order('created_at', { ascending: false }),
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = message === 'Unauthorized' ? 401 : 
                   message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: message
    }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await validateSuperAdminServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = createAdminClient();
    const body = await request.json();
    
    // Fetch current state for audit log
    const { data: oldTenant } = await admin
      .from('tenants')
      .select('id, name, slug, domains, logo_url, brand_primary, brand_secondary, status, plan, settings, created_by, created_at, updated_at')
      .eq('id', id)
      .single();

    const result = updateTenantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const { error } = await admin
      .from('tenants')
      .update(result.data)
      .eq('id', id);

    if (error) {
      console.error('[Superadmin Tenants PATCH] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: updatedTenant } = await admin
      .from('tenants')
      .select('id, name, slug, domains, logo_url, brand_primary, brand_secondary, status, plan, settings, created_by, created_at, updated_at')
      .eq('id', id)
      .single();

    // Record Audit Log
    const { recordAuditLog } = await import('@/lib/audit');
    await recordAuditLog({
      actorId: user.id,
      action: 'update_tenant',
      entityType: 'tenant',
      entityId: id,
      tenantId: id,
      oldData: oldTenant ?? undefined,
      newData: updatedTenant ?? undefined
    });

    return NextResponse.json({ tenant: updatedTenant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = message === 'Unauthorized' ? 401 : 
                   message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ 
      error: message
    }, { status });
  }
}
