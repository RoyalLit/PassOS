import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createUserSchema, updateUserSchema, deleteUserSchema } from '@/lib/validators/user-schema';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

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
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminProfile = await requireRole('admin');
    
    // Rate limit
    const limit = await checkRateLimit(`admin_users_post_${adminProfile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    
    // Zod validation
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    const { full_name, email, role, phone, hostel, room_number, parent_email } = result.data;
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
      console.error('[Admin Users POST] Auth AuthError:', authError);
      return NextResponse.json(
        { error: 'Email may already be in use or is invalid' },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500, headers: getRateLimitHeaders(limit) }
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
      console.error('[Admin Users POST] Profile Error:', profileError);
    }

    if (role === 'student') {
      await supabaseAdmin.from('student_states').insert({
        student_id: authUser.user.id,
        tenant_id: adminProfile.tenant_id,
      });
    }

    return NextResponse.json({
      success: true,
      user: { id: authUser.user.id, email, full_name, role },
      credentials: { email, temporary_password: tempPassword },
    }, { headers: getRateLimitHeaders(limit) });
  } catch (error: unknown) {
    console.error('[Admin Users POST] Internal Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminProfile = await requireRole('admin');
    
    // Rate limit
    const limit = await checkRateLimit(`admin_users_patch_${adminProfile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    
    // Manual extract user_id because it's not in updateUserSchema (could be, but let's just check it)
    const { user_id } = body;
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400, headers: getRateLimitHeaders(limit) });
    }

    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }
    
    const { role, full_name, phone, hostel, room_number, new_password, is_active } = result.data;

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
      if (authError) {
        console.error('[Admin Users PATCH] Auth AuthError:', authError);
      }
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
        ...(is_active !== undefined ? { is_active } : {}),
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('[Admin Users PATCH] Profile Error:', profileError);
    }

    return NextResponse.json({ success: true }, { headers: getRateLimitHeaders(limit) });
  } catch (error: unknown) {
    console.error('[Admin Users PATCH] Internal Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminProfile = await requireRole('admin');
    
    const limit = await checkRateLimit(`admin_users_delete_${adminProfile.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(limit) });
    }

    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    
    const result = deleteUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }
    
    const { user_id } = result.data;

    // Supabase admin.deleteUser does an ON DELETE CASCADE which drops the profile too.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (error) {
      console.error('[Admin Users DELETE] Supabase Auth Error:', error);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 400, headers: getRateLimitHeaders(limit) });
    }

    return NextResponse.json({ success: true }, { headers: getRateLimitHeaders(limit) });
  } catch (error: unknown) {
    console.error('[Admin Users DELETE] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}
