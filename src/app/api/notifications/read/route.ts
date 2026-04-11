import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const { error: updateError } = await adminClient
      .from('notification_logs')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error marking notification as read:', updateError);
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
