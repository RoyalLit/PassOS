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
      .eq('tenant_id', profile.tenant_id)
      .order('is_system', { ascending: false })
      .order('name');

    const { data: systemTemplates, error: systemError } = await supabase
      .from('escalation_templates')
      .select('*')
      .eq('is_system', true)
      .order('name');

    const allTemplates = [...(templates || []), ...(systemTemplates || [])];

    if (error && systemError) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: allTemplates || [] });
  } catch (error) {
    console.error('Escalation templates fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
