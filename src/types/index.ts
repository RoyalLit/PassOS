// ============================================================
// PassOS — Type Definitions
// ============================================================

export type UserRole = 'student' | 'parent' | 'admin' | 'guard';

export type RequestType = 'day_outing' | 'overnight' | 'emergency' | 'medical' | 'academic';

export type RequestStatus =
  | 'pending'
  | 'ai_review'
  | 'parent_pending'
  | 'parent_approved'
  | 'parent_rejected'
  | 'admin_pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type PassStatus = 'active' | 'used_exit' | 'used_entry' | 'expired' | 'revoked';

export type StudentState = 'inside' | 'outside' | 'overdue';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ScanType = 'exit' | 'entry';

export type ScanResult = 'valid' | 'expired' | 'already_used' | 'revoked' | 'invalid_signature' | 'error';

export type FraudFlagType = 'rapid_requests' | 'repeated_excuse' | 'late_returns' | 'suspicious_pattern' | 'manual_flag';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms';

export type ApproverType = 'parent' | 'admin' | 'system';

export type ApprovalDecision = 'approved' | 'rejected' | 'escalated';

// ============================================================
// Database Row Types
// ============================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  hostel: string | null;
  room_number: string | null;
  parent_id: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PassRequest {
  id: string;
  student_id: string;
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
  // Joined fields
  student?: Profile;
  ai_analysis?: AIAnalysis[];
  approvals?: Approval[];
}

export interface AIAnalysis {
  id: string;
  request_id: string;
  risk_level: RiskLevel;
  anomaly_score: number;
  flags: string[];
  reasoning: string | null;
  raw_response: Record<string, unknown> | null;
  model_version: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface Approval {
  id: string;
  request_id: string;
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
  qr_payload: string;
  qr_nonce: string;
  valid_from: string;
  valid_until: string;
  status: PassStatus;
  exit_at: string | null;
  entry_at: string | null;
  created_at: string;
  // Joined fields
  student?: Profile;
  request?: PassRequest;
}

export interface PassScan {
  id: string;
  pass_id: string;
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
  current_state: StudentState;
  active_pass_id: string | null;
  last_exit: string | null;
  last_entry: string | null;
  updated_at: string;
  // Joined
  student?: Profile;
}

export interface FraudFlag {
  id: string;
  student_id: string;
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
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  sent_at: string | null;
  created_at: string;
}

// ============================================================
// API Types
// ============================================================

export interface AIRiskResponse {
  risk_level: RiskLevel;
  anomaly_score: number;
  flags: string[];
  reasoning: string;
}

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
