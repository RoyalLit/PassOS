import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data: profile });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, hostel, room_number, avatar_url, metadata } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (hostel !== undefined) updates.hostel = hostel;
    if (room_number !== undefined) updates.room_number = room_number;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    
    if (metadata !== undefined && typeof metadata === 'object') {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', user.id)
        .single();
      
      updates.metadata = {
        ...(currentProfile?.metadata || {}),
        ...metadata,
      };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: profile });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
