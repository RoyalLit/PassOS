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
    const { id: user_id } = await params;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'System configuration error: Service role key missing.' }, { status: 500 });
    }

    await validateSuperAdminServer();
    const supabaseAdmin = createAdminClient();
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
      console.error('[Superadmin Users PATCH] Profile Error:', profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: user_id } = await params;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'System configuration error: Service role key missing.' }, { status: 500 });
    }

    await validateSuperAdminServer();
    const supabaseAdmin = createAdminClient();

    // deleteUser handles cascade to profiles table (due to FK with ON DELETE CASCADE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (error) {
      console.error('[Superadmin Users DELETE] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status });
  }
}
