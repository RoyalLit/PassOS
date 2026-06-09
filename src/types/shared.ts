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
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms';
export type ApproverType = 'parent' | 'admin' | 'warden' | 'system';
export type ApprovalDecision = 'approved' | 'rejected' | 'escalated';
