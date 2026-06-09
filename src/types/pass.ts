import type { Profile } from './profile';
import type { RequestType, RequestStatus, PassStatus, ScanType, ScanResult, ApproverType, ApprovalDecision } from './shared';

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
  current_state: string;
  active_pass_id: string | null;
  last_exit: string | null;
  last_entry: string | null;
  updated_at: string;
  student?: Profile;
}

export interface PassTimeLimit {
  id: string;
  tenant_id: string;
  pass_type: RequestType;
  enabled: boolean;
  allowed_start: string | null;
  allowed_end: string | null;
  max_duration_hours: number | null;
  created_at: string;
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
