import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

export type AuditLogAction = 
  | 'create_tenant' 
  | 'update_tenant' 
  | 'delete_tenant'
  | 'create_user' 
  | 'update_user' 
  | 'delete_user'
  | 'superadmin_login'
  | 'system_setting_change';

export interface RecordAuditLogParams {
  actorId: string;
  action: AuditLogAction;
  entityType: 'tenant' | 'profile' | 'system';
  entityId?: string;
  oldData?: any;
  newData?: any;
}

/**
 * Records an entry in the audit_logs table.
 * Designed to be called from Server Actions or API Routes.
 */
export async function recordAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  oldData,
  newData
}: RecordAuditLogParams) {
  try {
    const admin = createAdminClient();
    const headerList = await headers();
    
    // Extract security metadata
    const ipAddress = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';

    const { error } = await admin.from('audit_logs').insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    if (error) {
      console.error('[recordAuditLog] Database Error:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[recordAuditLog] Unexpected Error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}
