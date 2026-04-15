import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/lib/validators/profile-schema';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

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

    if (error) {
       console.error('[Profile GET] Database error:', error);
       return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
    }

    return NextResponse.json({ data: profile });
  } catch (error: unknown) {
    console.error('[Profile GET] Internal Server Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limit
    const limit = await checkRateLimit(`profile_patch_${user.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const body = await request.json();
    
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }
    
    const { phone, hostel, room_number, avatar_url, metadata } = result.data;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (phone !== undefined) updates.phone = phone;
    if (hostel !== undefined) updates.hostel = hostel;
    if (room_number !== undefined) updates.room_number = room_number;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    
    if (metadata !== undefined) {
      // Only permit known metadata keys — deny arbitrary writes to the JSONB field
      const ALLOWED_METADATA_KEYS = ['push_notifications_enabled', 'theme_preference', 'notification_sound'] as const;
      type AllowedKey = typeof ALLOWED_METADATA_KEYS[number];
      const sanitizedMetadata: Partial<Record<AllowedKey, unknown>> = {};
      for (const key of ALLOWED_METADATA_KEYS) {
        if (key in metadata) {
          sanitizedMetadata[key] = metadata[key];
        }
      }

      if (Object.keys(sanitizedMetadata).length > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', user.id)
          .single();
        
        updates.metadata = {
          ...(currentProfile?.metadata || {}),
          ...sanitizedMetadata,
        };
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
       console.error('[Profile PATCH] Database update error:', error);
       return NextResponse.json({ error: 'Failed to update profile' }, { status: 500, headers: getRateLimitHeaders(limit) });
    }

    return NextResponse.json({ data: profile }, { headers: getRateLimitHeaders(limit) });
  } catch (error: unknown) {
    console.error('[Profile PATCH] Internal Server Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}
