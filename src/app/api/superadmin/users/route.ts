import { NextResponse } from 'next/server';
import { validateSuperAdminServer } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserSchema } from '@/lib/validators/user-schema';
import { z } from 'zod';

function generateTempPassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const charsetLength = charset.length;
  const maxValid = Math.floor(256 / charsetLength) * charsetLength;
  const result: string[] = [];
  while (result.length < length) {
    const randomValues = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of randomValues) {
      if (byte < maxValid && result.length < length) {
        result.push(charset[byte % charsetLength]);
      }
    }
  }
  return result.join('');
}

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[API/Superadmin/Users] SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json({ 
        error: 'System configuration error: Service role key missing.'
      }, { status: 500 });
    }

    await validateSuperAdminServer();
    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*, tenant:tenants!tenant_id(id, name, slug)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/Superadmin/Users] Fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'System configuration error: Service role key missing.' }, { status: 500 });
    }

    await validateSuperAdminServer();
    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    
    // Extend schema for superadmin to require tenant_id
    const superadminCreateSchema = createUserSchema.extend({
      tenant_id: z.string().uuid("Target University ID is required")
    });

    const result = superadminCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const { full_name, email, role, tenant_id, phone, enrollment_number, hostel, room_number } = result.data;
    const tempPassword = generateTempPassword();

    // 1. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role, full_name, tenant_id },
    });

    if (authError) {
      console.error('[Superadmin Users POST] Auth Error:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
    }

    // 2. Create Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.user.id,
      tenant_id,
      full_name,
      email,
      role,
      phone,
      enrollment_number,
      hostel,
      room_number
    });

    if (profileError) {
      console.error('[Superadmin Users POST] Profile Error:', profileError.message);
      // Clean up auth user if profile fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Create Student State if applicable
    if (role === 'student') {
      await supabaseAdmin.from('student_states').insert({
        student_id: authUser.user.id,
        tenant_id
      });
    }

    return NextResponse.json({
      success: true,
      user: { id: authUser.user.id, email, full_name, role },
      credentials: { email, temporary_password: tempPassword }
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 
                   error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status });
  }
}
