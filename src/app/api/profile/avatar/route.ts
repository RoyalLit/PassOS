import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { uploadAvatarSchema } from '@/lib/validators/profile-schema';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const limit = await checkRateLimit(`avatar_upload_${user.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const body = await request.json();
    
    // Zod Validation covers file size, types, and presence
    const result = uploadAvatarSchema.safeParse(body);
    if (!result.success) {
      // Flatten the error message
      const firstError = result.error.issues[0]?.message || 'Validation failed';
      return NextResponse.json(
        { error: firstError, details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }
    
    const { file_name, file_type, file_data } = result.data;

    const ext = file_name.split('.').pop() || 'jpg';
    const file_path = `${user.id}/${Date.now()}.${ext}`;

    // Convert base64 to buffer
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
      console.error('[Avatar Upload] Storage error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed. File format or storage error.` },
        { status: 500, headers: getRateLimitHeaders(limit) }
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
      console.error('[Avatar Upload] Profile update error:', profileError);
      return NextResponse.json(
        { error: `Avatar uploaded but failed to link to profile.` },
        { status: 500, headers: getRateLimitHeaders(limit) }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl.publicUrl,
    }, { headers: getRateLimitHeaders(limit) });
  } catch (error: unknown) {
    console.error('[Avatar Upload] Internal Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

