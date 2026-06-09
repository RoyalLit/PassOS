import type { NotificationChannel } from './shared';

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  notify_pass_approved: boolean;
  notify_pass_rejected: boolean;
  notify_pass_overdue: boolean;
  notify_parent_approval_needed: boolean;
  notify_escalation: boolean;
  notify_new_announcement: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type NotificationEventType =
  | 'pass_approved'
  | 'pass_rejected'
  | 'pass_overdue'
  | 'parent_approval_needed'
  | 'escalation'
  | 'announcement';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

export interface NotificationTemplate {
  id: string;
  event_type: string;
  title_template: string;
  body_template: string;
  channels: NotificationChannel[];
  created_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: NotificationEventType;
  data: Record<string, unknown> | null;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sent_at: string | null;
  read_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SubscribeRequest {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface Notification {
  id: string;
  user_id: string;
  tenant_id: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  sent_at: string | null;
  created_at: string;
}
