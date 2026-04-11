import { createClient } from '@/lib/supabase/server';
import type { NotificationPayload, NotificationEventType } from '@/types';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface SendPushResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

export async function getUserSubscriptions(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return data || [];
}

export async function checkNotificationPreference(
  userId: string,
  eventType: NotificationEventType
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('push_enabled, notify_pass_approved, notify_pass_rejected, notify_pass_overdue, notify_parent_approval_needed, notify_escalation, notify_new_announcement, quiet_hours_start, quiet_hours_end, timezone')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return true;
  }

  if (!data.push_enabled) {
    return false;
  }

  const eventPreferenceMap: Record<NotificationEventType, string> = {
    pass_approved: 'notify_pass_approved',
    pass_rejected: 'notify_pass_rejected',
    pass_overdue: 'notify_pass_overdue',
    parent_approval_needed: 'notify_parent_approval_needed',
    escalation: 'notify_escalation',
    announcement: 'notify_new_announcement',
  };

  const preferenceField = eventPreferenceMap[eventType];
  if (preferenceField && !data[preferenceField]) {
    return false;
  }

  if (data.quiet_hours_start && data.quiet_hours_end) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (data.quiet_hours_start <= data.quiet_hours_end) {
      if (currentTime >= data.quiet_hours_start && currentTime <= data.quiet_hours_end) {
        return false;
      }
    } else {
      if (currentTime >= data.quiet_hours_start || currentTime <= data.quiet_hours_end) {
        return false;
      }
    }
  }

  return true;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag || 'passos-notification',
        data: payload.data,
        actions: payload.actions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

export async function notifyUser(
  userId: string,
  eventType: NotificationEventType,
  payload: NotificationPayload
): Promise<SendPushResult> {
  const shouldNotify = await checkNotificationPreference(userId, eventType);
  
  if (!shouldNotify) {
    return { success: true, sent: 0, failed: 0 };
  }

  const supabase = await createClient();

  const logId = await supabase.rpc('log_notification', {
    p_user_id: userId,
    p_title: payload.title,
    p_body: payload.body,
    p_notification_type: eventType,
    p_data: payload.data || null,
  });

  const subscriptions = await getUserSubscriptions(userId);
  
  if (subscriptions.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    const result = await sendPushNotification(subscription, payload);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) {
        errors.push(result.error);
      }
      
      if (result.error?.includes('410') || result.error?.includes('NotFound')) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);
      }
    }
  }

  await supabase.rpc('update_notification_status', {
    p_log_id: logId,
    p_status: failed === 0 ? 'sent' : (sent > 0 ? 'sent' : 'failed'),
    p_error_message: errors.length > 0 ? errors.join('; ') : null,
  });

  return { success: true, sent, failed, errors: errors.length > 0 ? errors : undefined };
}

export async function notifyMultipleUsers(
  userIds: string[],
  eventType: NotificationEventType,
  payload: NotificationPayload
): Promise<Map<string, SendPushResult>> {
  const results = new Map<string, SendPushResult>();

  await Promise.all(
    userIds.map(async (userId) => {
      const result = await notifyUser(userId, eventType, payload);
      results.set(userId, result);
    })
  );

  return results;
}

export const NotificationTemplates = {
  pass_approved: {
    title: 'Pass Approved! 🎉',
    body: 'Your {pass_type} pass has been approved. Valid from {valid_from} to {valid_until}.',
  },
  pass_rejected: {
    title: 'Pass Request Rejected',
    body: 'Your {pass_type} pass request has been rejected. Reason: {reason}',
  },
  pass_overdue: {
    title: '⚠️ Pass Overdue Alert',
    body: 'Student {student_name} has not returned. Pass expired at {valid_until}.',
  },
  parent_approval_needed: {
    title: 'Approval Required',
    body: 'Your child {student_name} has requested a {pass_type} pass. Please approve or reject.',
  },
  escalation: {
    title: '🚨 Escalation Alert',
    body: 'Issue with student {student_name} requires your attention. {details}',
  },
  announcement: {
    title: '📢 Announcement',
    body: '{message}',
  },
} as const;

export function formatNotificationTemplate(
  eventType: NotificationEventType,
  variables: Record<string, string>
): { title: string; body: string } {
  const template = NotificationTemplates[eventType];
  
  let title = template.title;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return { title, body };
}
