import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limit
    const limit = await checkRateLimit(`push_post_${user.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const adminClient = createAdminClient();
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    const { data, error } = await adminClient.rpc('save_push_subscription', {
      p_user_id: user.id,
      p_endpoint: endpoint,
      p_keys: keys,
    });

    if (error) {
      console.error('[Push POST] RPC error:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500, headers: getRateLimitHeaders(limit) });
    }

    return NextResponse.json({ success: true, data }, { headers: getRateLimitHeaders(limit) });
  } catch (error) {
    console.error('[Push POST] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limit
    const limit = await checkRateLimit(`push_delete_${user.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400, headers: getRateLimitHeaders(limit) });
    }

    const { data, error } = await adminClient.rpc('delete_push_subscription', {
      p_user_id: user.id,
      p_endpoint: endpoint,
    });

    if (error) {
      console.error('[Push DELETE] RPC error:', error);
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500, headers: getRateLimitHeaders(limit) });
    }

    return NextResponse.json({ success: true, deleted: data }, { headers: getRateLimitHeaders(limit) });
  } catch (error) {
    console.error('[Push DELETE] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limit
    const limit = await checkRateLimit(`push_get_${user.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const adminClient = createAdminClient();
    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, keys, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('[Push GET] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500, headers: getRateLimitHeaders(limit) });
    }

    return NextResponse.json({ subscriptions: subscriptions || [] }, { headers: getRateLimitHeaders(limit) });
  } catch (error) {
    console.error('[Push GET] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}

