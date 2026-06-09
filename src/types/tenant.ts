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
