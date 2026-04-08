import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { file_name, file_type, file_size } = body;

    if (!file_name || !file_type || !file_size) {
      return NextResponse.json(
        { error: 'file_name, file_type, and file_size are required' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file_size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file_type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, GIF, and WebP images are allowed' },
        { status: 400 }
      );
    }

    const ext = file_name.split('.').pop() || 'jpg';
    const file_path = `avatars/${user.id}/${Date.now()}.${ext}`;

    const supabaseAdmin = createAdminClient();

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .createSignedUploadUrl(file_path);

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      upload_url: uploadData.signedUrl,
      file_path,
      fields: {
        'Content-Type': file_type,
      },
    });
  } catch (error: unknown) {
    console.error('Avatar upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
