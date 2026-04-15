// ============================================================
// PassOS — Type Definitions
// ============================================================

export type UserRole = 'student' | 'parent' | 'admin' | 'guard' | 'superadmin' | 'warden';

export type RequestType = 'day_outing' | 'overnight' | 'emergency' | 'medical' | 'academic';

export type RequestStatus =
  | 'pending'
  | 'parent_pending'
  | 'parent_approved'
  | 'parent_rejected'
  | 'admin_pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type PassStatus = 'active' | 'used_exit' | 'used_entry' | 'expired' | 'revoked';

export type StudentState = 'inside' | 'outside' | 'overdue';


export type ScanType = 'exit' | 'entry';

export type ScanResult = 'valid' | 'expired' | 'already_used' | 'revoked' | 'invalid_signature' | 'late_entry' | 'error';

export type FraudFlagType = 'rapid_requests' | 'repeated_excuse' | 'late_returns' | 'suspicious_pattern' | 'manual_flag';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms';

export type ApproverType = 'parent' | 'admin' | 'warden' | 'system';

export type ApprovalDecision = 'approved' | 'rejected' | 'escalated';

// ============================================================
// Database Row Types
// ============================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  enrollment_number: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  hostel: string | null;
  room_number: string | null;
  parent_id: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  metadata: Record<string, unknown>;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  wardens?: Warden[];
}

export interface PassRequest {
  id: string;
  student_id: string;
  tenant_id: string;
  request_type: RequestType;
  reason: string;
  destination: string;
  departure_at: string;
  return_by: string;
  proof_urls: string[];
  geo_lat: number | null;
  geo_lng: number | null;
  geo_valid: boolean;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  student?: Profile;
  approvals?: Approval[];
}


export interface Approval {
  id: string;
  request_id: string;
  tenant_id: string;
  approver_id: string | null;
  approver_type: ApproverType;
  decision: ApprovalDecision;
  reason: string | null;
  token: string | null;
  token_expires: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Pass {
  id: string;
  request_id: string;
  student_id: string;
  tenant_id: string;
  qr_payload: string;
  qr_nonce: string;
  valid_from: string;
  valid_until: string;
  status: PassStatus;
  exit_at: string | null;
  entry_at: string | null;
  created_at: string;
  student?: Profile;
  request?: PassRequest;
}

export interface PassScan {
  id: string;
  pass_id: string;
  tenant_id: string;
  guard_id: string;
  scan_type: ScanType;
  geo_lat: number | null;
  geo_lng: number | null;
  device_info: Record<string, unknown>;
  scan_result: ScanResult;
  created_at: string;
}

export interface StudentStateRow {
  student_id: string;
  tenant_id: string;
  current_state: StudentState;
  active_pass_id: string | null;
  last_exit: string | null;
  last_entry: string | null;
  updated_at: string;
  student?: Profile;
}

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

export interface AuditLog {
  id: string;
  actor_id: string | null;
  tenant_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
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

// ============================================================
// Multi-Tenant Types
// ============================================================

export type TenantStatus = 'active' | 'inactive' | 'trial' | 'suspended';
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TenantSettings {
  geofencing_enabled: boolean;
  campus_lat: number;
  campus_lng: number;
  campus_radius_meters: number;
  parent_approval_mode: 'none' | 'smart' | 'all';
  gatepass_reasons?: {
    day_outing: string[];
    overnight: string[];
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantStats {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  total_students: number;
  total_users: number;
  active_passes: number;
  students_outside: number;
  overdue_students: number;
  pending_requests: number;
  fraud_flags: number;
}

// ============================================================
// API Types
// ============================================================


export interface QRPayload {
  pass_id: string;
  student_id: string;
  nonce: string;
  valid_until: string;
  iat: number;
}

export interface ScanVerifyResult {
  valid: boolean;
  result: ScanResult;
  pass?: Pass;
  student?: Profile;
  message: string;
}

export interface DashboardStats {
  total_active_passes: number;
  students_outside: number;
  students_overdue: number;
  pending_requests: number;
  today_requests: number;
  today_approved: number;
  today_rejected: number;
  flagged_students: number;
}

// ============================================================
// Warden Types
// ============================================================

export interface Warden {
  id: string;
  profile_id: string;
  hostel: string;
  created_at: string;
  profile?: Profile;
}

export interface HostelAssignment {
  id: string;
  student_id: string;
  hostel: string;
  assigned_by: string | null;
  assigned_at: string;
  student?: Profile;
}

export interface WardenStudent extends Profile {
  current_state: StudentState;
  active_pass_id: string | null;
  parent?: Profile;
}

export interface WardenDashboardStats {
  total_students: number;
  students_inside: number;
  students_outside: number;
  students_overdue: number;
  pending_requests: number;
  today_passes_issued: number;
  hostels: string[];
}

export interface WardenPendingRequest extends PassRequest {
  student?: WardenStudent;
}

// ============================================================
// Pass Time Limits Types
// ============================================================

export interface PassTimeLimit {
  id: string;
  tenant_id: string;
  pass_type: RequestType;
  enabled: boolean;
  allowed_start: string | null; // HH:MM format
  allowed_end: string | null;   // HH:MM format
  max_duration_hours: number | null;
  created_at: string;
}

// ============================================================
// Escalation Types
// ============================================================

export type EscalationEventType = 
  | 'pass_overdue' 
  | 'rapid_requests' 
  | 'suspicious_pattern'
  | 'late_returns';

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
  actions_taken: EscalationAction[];
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

export interface EscalationAction {
  action: string;
  timestamp: string;
  recipients: string[];
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

// ============================================================
// Push Notification Types
// ============================================================

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
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
  actions?: Array<{
    action: string;
    title: string;
  }>;
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

// Client-side push subscription request
export interface SubscribeRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
