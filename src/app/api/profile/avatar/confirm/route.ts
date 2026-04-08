import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { avatar_url } = body;

    if (!avatar_url) {
      return NextResponse.json(
        { error: 'avatar_url is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: publicUrl } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(avatar_url);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        avatar_url: publicUrl.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, avatar_url: publicUrl.publicUrl });
  } catch (error: unknown) {
    console.error('Avatar confirm error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
