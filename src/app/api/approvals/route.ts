import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyApprovalToken } from '@/lib/crypto/approval-tokens';
import { requireRole } from '@/lib/auth/rbac';
import { approvalSchema } from '@/lib/validators/request-schema';
import { generatePass } from '@/app/api/passes/route';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = approvalSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { request_id, decision, reason, token } = result.data;
    const supabase = createAdminClient();

    // Verify request exists
    const { data: passReq } = await supabase
      .from('pass_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (!passReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    let approver_id = null;
    let approver_type = 'admin';

    // Route 1: Parent Approval via Token
    if (token) {
      const payload = await verifyApprovalToken(token);
      if (!payload || payload.request_id !== request_id) {
        return NextResponse.json({ error: 'Invalid or expired approval token' }, { status: 403 });
      }
      
      // Verify token hasn't been used
      const { data: existingApproval } = await supabase
        .from('approvals')
        .select('decision')
        .eq('token', token)
        .single();
        
      if (existingApproval && existingApproval.decision !== 'escalated') {
        return NextResponse.json({ error: 'Link already used' }, { status: 400 });
      }

      approver_id = payload.parent_id;
      approver_type = 'parent';
      
      // Update the parent's approval record
      await supabase
        .from('approvals')
        .update({ decision, reason, ip_address: request.headers.get('x-forwarded-for') })
        .eq('token', token);
        
      // Advance the core request
      const nextStatus = decision === 'approved' ? 'admin_pending' : 'parent_rejected';
      await supabase
        .from('pass_requests')
        .update({ status: nextStatus })
        .eq('id', request_id);

      return NextResponse.json({ success: true, next_status: nextStatus });
    }

    // Route 2: Admin Approval via Session
    const adminProfile = await requireRole('admin');
    approver_id = adminProfile.id;
    approver_type = 'admin';

    // Must be in a pending state
    if (!['pending', 'ai_review', 'admin_pending', 'parent_pending'].includes(passReq.status)) {
      return NextResponse.json({ error: 'Request not in approvable state' }, { status: 400 });
    }

    // Record admin approval
    await supabase.from('approvals').insert({
      request_id,
      approver_id,
      approver_type,
      decision,
      reason,
      ip_address: request.headers.get('x-forwarded-for'),
    });

    const finalStatus = decision === 'approved' ? 'approved' : 'rejected';
    await supabase.from('pass_requests').update({ status: finalStatus }).eq('id', request_id);

    // If approved, trigger pass generation synchronously
    if (finalStatus === 'approved') {
      console.log('Spawning pass internally for request:', request_id);
      try {
        await generatePass(request_id);
      } catch (e: any) {
        console.error('Pass Generation crashed:', e);
        return NextResponse.json({ error: `Pass Generation crashed: ${e.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, final_status: finalStatus });

  } catch (error: any) {
    console.error('Approval handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}
