import type { Profile } from './profile';
import type { Severity } from './shared';

export type FraudFlagType = 'rapid_requests' | 'repeated_excuse' | 'late_returns' | 'suspicious_pattern' | 'manual_flag';

export interface FraudFlag {
  id: string;
  student_id: string;
  tenant_id: string;
  flag_type: FraudFlagType;
  severity: Severity;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  student?: Profile;
}

export type EscalationEventType = 'pass_overdue' | 'rapid_requests' | 'suspicious_pattern' | 'late_returns';
export type EscalationPriority = 'low' | 'medium' | 'high' | 'critical';
export type EscalationStatus = 'active' | 'acknowledged' | 'resolved' | 'escalated';

export interface EscalationRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  event_type: EscalationEventType;
  threshold_minutes: number;
  priority: EscalationPriority;
  notify_student: boolean;
  notify_parents: boolean;
  notify_wardens: boolean;
  notify_admins: boolean;
  auto_action: string | null;
  action_params: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalationLog {
  id: string;
  tenant_id: string | null;
  student_id: string;
  pass_id: string | null;
  rule_id: string | null;
  trigger_event: string;
  trigger_details: Record<string, unknown>;
  actions_taken: { action: string; timestamp: string; recipients: string[] }[];
  recipients_notified: string[];
  priority: EscalationPriority;
  status: EscalationStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  student?: Profile;
}

export interface EscalationTemplate {
  id: string;
  name: string;
  event_type: EscalationEventType;
  default_threshold_minutes: number;
  default_priority: EscalationPriority;
  notify_student: boolean;
  notify_parents: boolean;
  notify_wardens: boolean;
  notify_admins: boolean;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface EscalationContact {
  id: string;
  tenant_id: string;
  profile_id: string;
  contact_type: 'warden' | 'admin' | 'emergency';
  is_primary: boolean;
  phone_override: string | null;
  email_override: string | null;
  notify_push: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  quiet_until: string | null;
  created_at: string;
}
