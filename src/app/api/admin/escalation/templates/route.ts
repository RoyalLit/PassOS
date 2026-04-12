import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';

export async function GET() {
  try {
    const profile = await requireRole('admin', 'warden');
    const supabase = createAdminClient();

    const { data: templates, error } = await supabase
      .from('escalation_templates')
      .select('*')
      .or(`tenant_id.eq.${profile.tenant_id},is_system.eq.true`)
      .order('is_system', { ascending: false })
      .order('name');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Escalation templates fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
