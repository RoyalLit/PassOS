import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const adminUser = await requireRole('admin', 'warden', 'superadmin');
    const supabase = createAdminClient();

    const { pass_id } = await request.json();
    if (!pass_id) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Update the pass to 'revoked' if it's active or used_exit
    const { data: pass, error: passError } = await supabase
      .from('passes')
      .update({ status: 'revoked' })
      .eq('id', pass_id)
      .in('status', ['active', 'used_exit'])
      .select('student_id, tenant_id')
      .single();

    if (passError || !pass) {
      console.error('[Admin] Failed to revoke pass:', passError);
      return NextResponse.json({ 
        error: 'Pass not found or not in a revokable state' 
      }, { status: 404 });
    }

    // Reset student state if they are currently outside
    // If they were outside, they are marked overdue now to raise an alarm, or we just leave them 'outside' so the guard knows they need to enter.
    // However, if we revoke an 'active' pass before they leave, they are currently 'inside'. So nothing to update there. Let's just clear active_pass_id.
    const { error: stateError } = await supabase
      .from('student_states')
      .update({ active_pass_id: null })
      .eq('student_id', pass.student_id);
      
    if (stateError) {
      console.error('[Admin] Failed to update student state after revocation:', stateError);
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: adminUser.id,
      tenant_id: pass.tenant_id,
      action: 'revoke_pass',
      entity_type: 'passes',
      entity_id: pass_id,
      new_data: { status: 'revoked' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin] Revoke pass error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' }, 
      { status: 500 }
    );
  }
}
