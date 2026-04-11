import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: preferences, error: prefsError } = await supabase.rpc(
      'get_notification_preferences',
      { p_user_id: user.id }
    );

    if (prefsError) {
      console.error('Error fetching notification preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      push_enabled,
      email_enabled,
      notify_pass_approved,
      notify_pass_rejected,
      notify_pass_overdue,
      notify_parent_approval_needed,
      notify_escalation,
      notify_new_announcement,
      quiet_hours_start,
      quiet_hours_end,
      timezone,
    } = body;

    const { data: preferences, error: prefsError } = await supabase.rpc(
      'update_notification_preferences',
      {
        p_user_id: user.id,
        p_push_enabled: push_enabled,
        p_email_enabled: email_enabled,
        p_notify_pass_approved: notify_pass_approved,
        p_notify_pass_rejected: notify_pass_rejected,
        p_notify_pass_overdue: notify_pass_overdue,
        p_notify_parent_approval_needed: notify_parent_approval_needed,
        p_notify_escalation: notify_escalation,
        p_notify_new_announcement: notify_new_announcement,
        p_quiet_hours_start: quiet_hours_start,
        p_quiet_hours_end: quiet_hours_end,
        p_timezone: timezone,
      }
    );

    if (prefsError) {
      console.error('Error updating notification preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('Notification preferences update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
