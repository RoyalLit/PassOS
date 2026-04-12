import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

const revokeSchema = z.object({
  pass_id: z.string().uuid("Invalid pass ID format"),
});

export async function POST(request: Request) {
  try {
    const adminUser = await requireRole('admin', 'warden', 'superadmin');
    
    // Rate limit
    const limit = await checkRateLimit(`admin_revoke_${adminUser.id}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: getRateLimitHeaders(limit)
      });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const result = revokeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid pass ID format', details: result.error.format() },
        { status: 400, headers: getRateLimitHeaders(limit) }
      );
    }

    const { pass_id } = result.data;

    // Update the pass to 'revoked' if it's active or used_exit
    const { data: pass, error: passError } = await supabase
      .from('passes')
      .update({ status: 'revoked' })
      .eq('id', pass_id)
      .in('status', ['active', 'used_exit'])
      .select('student_id, tenant_id')
      .single();

    if (passError || !pass) {
      console.error('[Admin Revoke] Failed to revoke pass:', passError);
      return NextResponse.json({ 
        error: 'Pass not found or not in a revokable state' 
      }, { status: 404, headers: getRateLimitHeaders(limit) });
    }

    // Reset student state if they are currently outside
    const { error: stateError } = await supabase
      .from('student_states')
      .update({ active_pass_id: null })
      .eq('student_id', pass.student_id);
      
    if (stateError) {
      console.error('[Admin Revoke] Failed to update student state:', stateError);
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

    return NextResponse.json({ success: true }, { headers: getRateLimitHeaders(limit) });
  } catch (error) {
    console.error('[Admin Revoke] Internal error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred' }, 
      { status: 500 }
    );
  }
}
