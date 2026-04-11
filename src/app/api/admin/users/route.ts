import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function generateTempPassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map(x => charset[x % charset.length])
    .join('');
}

export async function GET(request: Request) {
  try {
    await requireRole('admin');
    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role && ['student', 'parent', 'guard', 'admin', 'warden', 'superadmin'].includes(role)) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    console.error('Get users error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminProfile = await requireRole('admin');
    const supabaseAdmin = createAdminClient();
    const body = await request.json();

    const { full_name, email, role, phone, hostel, room_number, parent_email } = body;

    if (!full_name || !email || !role) {
      return NextResponse.json(
        { error: 'Full name, email, and role are required' },
        { status: 400 }
      );
    }

    if (!['student', 'parent', 'guard', 'warden'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be student, parent, guard, or warden' },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role,
        full_name,
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    let parentId = null;
    if (role === 'student' && parent_email) {
      const { data: parentProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', parent_email)
        .eq('role', 'parent')
        .single();
      
      if (parentProfile) {
        parentId = parentProfile.id;
      }
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.user.id,
      full_name,
      email,
      phone: phone || null,
      hostel: hostel || null,
      room_number: room_number || null,
      role,
      parent_id: parentId,
      tenant_id: adminProfile.tenant_id,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    if (role === 'student') {
      await supabaseAdmin.from('student_states').insert({
        student_id: authUser.user.id,
        tenant_id: adminProfile.tenant_id,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        full_name,
        role,
      },
      credentials: {
        email,
        temporary_password: tempPassword,
      },
    });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole('admin');
    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    const { user_id, role, full_name, phone, hostel, room_number, new_password } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Role validation
    if (role && !['student', 'parent', 'guard', 'warden', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update Auth User Metadata or Password
    if (role || full_name || new_password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        {
          ...(new_password ? { password: new_password } : {}),
          user_metadata: {
            ...(role ? { role } : {}),
            ...(full_name ? { full_name } : {}),
          }
        }
      );
      if (authError) throw authError;
    }

    // Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(role ? { role } : {}),
        ...(full_name ? { full_name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(hostel !== undefined ? { hostel: hostel || null } : {}),
        ...(room_number !== undefined ? { room_number: room_number || null } : {}),
      })
      .eq('id', user_id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Update user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole('admin');
    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
