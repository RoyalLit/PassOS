import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rules, error } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('priority', { ascending: false })
      .order('threshold_minutes', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error('Escalation rules fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      event_type,
      threshold_minutes,
      priority,
      notify_student,
      notify_parents,
      notify_wardens,
      notify_admins,
      auto_action,
      action_params,
    } = body;

    if (!name || !event_type || threshold_minutes === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, event_type, threshold_minutes' },
        { status: 400 }
      );
    }

    const { data: rule, error } = await supabase
      .from('escalation_rules')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        description,
        event_type,
        threshold_minutes,
        priority: priority || 'medium',
        notify_student: notify_student ?? true,
        notify_parents: notify_parents ?? true,
        notify_wardens: notify_wardens ?? true,
        notify_admins: notify_admins ?? false,
        auto_action,
        action_params: action_params || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Escalation rule create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
