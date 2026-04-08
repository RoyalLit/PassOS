import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { file_name, file_type, file_size, file_data } = body;

    if (!file_name || !file_type || !file_size || !file_data) {
      return NextResponse.json(
        { error: 'file_name, file_type, file_size, and file_data are required' },
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
    const file_path = `${user.id}/${Date.now()}.${ext}`;

    // Convert base64 to buffer (more reliable in Node.js)
    const base64Data = file_data.includes('base64,') 
      ? file_data.split('base64,')[1] 
      : file_data;
    
    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(file_path, buffer, {
        contentType: file_type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL and save to profile
    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(file_path);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: `Profile update failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl.publicUrl,
    });
  } catch (error: unknown) {
    console.error('Avatar upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
