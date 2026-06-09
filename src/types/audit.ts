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
  record_hash: string | null;
  prev_hash: string | null;
  created_at: string;
}
