import { NextResponse, type NextRequest } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateUserSchema } from '@/lib/validators/user-schema';
import { z } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user_id = id;
    const { user } = await validateSuperAdminServer();
    const supabaseAdmin = createAdminClient();
    
    // Fetch old profile for audit log
    const { data: oldProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, enrollment_number, email, phone, avatar_url, hostel, room_number, parent_id, is_active, is_flagged, flag_reason, metadata, tenant_id, created_at, updated_at')
      .eq('id', user_id)
      .single();

    const body = await request.json();
    
    const result = updateUserSchema.extend({
      tenant_id: z.string().uuid().optional()
    }).safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const { full_name, role, enrollment_number, phone, hostel, room_number, is_active, new_password, tenant_id } = result.data;

    // 1. Update Auth User if needed
    if (full_name || role || new_password || tenant_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ...(new_password ? { password: new_password } : {}),
        user_metadata: {
          ...(full_name ? { full_name } : {}),
          ...(role ? { role } : {}),
          ...(tenant_id ? { tenant_id } : {}),
        }
      });
      if (authError) {
        console.error('[Superadmin Users PATCH] Auth Update Error:', authError.message);
      }
    }

    // 2. Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(full_name ? { full_name } : {}),
        ...(role ? { role } : {}),
        ...(tenant_id ? { tenant_id } : {}),
        ...(enrollment_number !== undefined ? { enrollment_number: enrollment_number || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(hostel !== undefined ? { hostel: hostel || null } : {}),
        ...(room_number !== undefined ? { room_number: room_number || null } : {}),
        ...(is_active !== undefined ? { is_active } : {}),
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('[Superadmin Users PATCH] Profile Update Error:', profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data: newProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, enrollment_number, email, phone, avatar_url, hostel, room_number, parent_id, is_active, is_flagged, flag_reason, metadata, tenant_id, created_at, updated_at')
      .eq('id', user_id)
      .single();

    // Record Audit Log
    const { recordAuditLog } = await import('@/lib/audit');
    await recordAuditLog({
      actorId: user.id,
      action: 'update_user',
      entityType: 'profile',
      entityId: user_id,
      tenantId: newProfile?.tenant_id,
      oldData: oldProfile ?? undefined,
      newData: newProfile ?? undefined
    });

    return NextResponse.json({ user: newProfile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = message === 'Unauthorized' ? 401 : 
                   message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await validateSuperAdminServer();
    const supabaseAdmin = createAdminClient();

    // Fetch profile for audit log before deletion
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, enrollment_number, email, phone, avatar_url, hostel, room_number, parent_id, is_active, is_flagged, flag_reason, metadata, tenant_id, created_at, updated_at')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      console.error('[Superadmin Users DELETE] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record Audit Log
    const { recordAuditLog } = await import('@/lib/audit');
    await recordAuditLog({
      actorId: user.id,
      action: 'delete_user',
      entityType: 'profile',
      entityId: id,
      tenantId: profile?.tenant_id,
      oldData: profile ?? undefined
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = message === 'Unauthorized' ? 401 : 
                   message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
