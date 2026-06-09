import type { UserRole, StudentState } from './shared';
import type { Tenant } from './tenant';

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
  tenant?: Tenant;
  created_at: string;
  updated_at: string;
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

export interface WardenPendingRequest {
  id: string;
  student?: {
    full_name: string;
    enrollment_number: string | null;
    hostel: string | null;
  };
  reason: string;
  departure_at: string;
  status: string;
}

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
