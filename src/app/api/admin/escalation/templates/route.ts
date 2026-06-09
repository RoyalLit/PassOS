import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';

export async function GET() {
  try {
    const profile = await requireRole('admin', 'warden');
    const supabase = createAdminClient();

    const [tenantResult, systemResult] = await Promise.all([
      supabase
        .from('escalation_templates')
        .select('id, name, event_type, default_threshold_minutes, default_priority, notify_student, notify_parents, notify_wardens, notify_admins, description, is_system, created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('is_system', { ascending: false })
        .order('name'),
      supabase
        .from('escalation_templates')
        .select('id, name, event_type, default_threshold_minutes, default_priority, notify_student, notify_parents, notify_wardens, notify_admins, description, is_system, created_at')
        .eq('is_system', true)
        .order('name'),
    ]);

    if (tenantResult.error && systemResult.error) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    const allTemplates = [...(tenantResult.data || []), ...(systemResult.data || [])];

    return NextResponse.json({ templates: allTemplates || [] });
  } catch (error) {
    console.error('Escalation templates fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
