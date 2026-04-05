import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeRequest } from '@/lib/ai/risk-analyzer';
import { generateApprovalToken, buildApprovalUrl } from '@/lib/crypto/approval-tokens';
import { getSettings } from '@/lib/actions/settings';

export async function POST(request: Request) {
  try {
    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ error: 'request_id required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch request and student profile
    const { data: passReq } = await supabase
      .from('pass_requests')
      .select('*, student:profiles(*)')
      .eq('id', request_id)
      .single();

    if (!passReq || passReq.status !== 'ai_review') {
      return NextResponse.json({ error: 'Invalid request or state' }, { status: 400 });
    }

    // 2. Run AI Analysis (updates DB automatically)
    const aiResult = await analyzeRequest(request_id);
    
    // 3. Fetch global settings to determine approval path
    const settings = await getSettings();
    const mode = settings.parent_approval_mode;

    // 4. Determine if parent approval is needed
    let requiresParent = false;

    if (passReq.student?.parent_id) {
      if (mode === 'all') {
        requiresParent = true;
      } else if (mode === 'smart') {
        // High-stakes types require parent sign-off in Smart mode
        const highStakesTypes = ['overnight', 'emergency', 'medical'];
        requiresParent = highStakesTypes.includes(passReq.request_type);
      }
      // if mode === 'none', requiresParent remains false
    }

    // 5. Route accordingly
    if (requiresParent && passReq.student?.parent_id) {
      // Generate signed token
      const token = await generateApprovalToken({
        request_id: passReq.id,
        parent_id: passReq.student.parent_id,
        student_name: passReq.student.full_name,
      });

      // Store in approvals table
      await supabase.from('approvals').insert({
        request_id: passReq.id,
        approver_id: passReq.student.parent_id,
        approver_type: 'parent',
        decision: 'escalated',
        token: token,
        token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Update status to awaiting parent
      await supabase
        .from('pass_requests')
        .update({ status: 'parent_pending' })
        .eq('id', request_id);

      // Trigger n8n webhook
      const webhookUrl = process.env.N8N_WEBHOOK_BASE_URL;
      if (webhookUrl) {
        const approvalUrl = buildApprovalUrl(token);
        await fetch(`${webhookUrl}/parent-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: passReq.id,
            student_name: passReq.student.full_name,
            reason: passReq.reason,
            destination: passReq.destination,
            departure_at: passReq.departure_at,
            return_by: passReq.return_by,
            risk_level: aiResult.risk_level,
            approval_link: approvalUrl,
          }),
        }).catch(e => console.error('Failed to trigger n8n webhook:', e));
      }
    } else {
      // Skip parent, go straight to admin review
      await supabase
        .from('pass_requests')
        .update({ status: 'admin_pending' })
        .eq('id', request_id);
    }

    return NextResponse.json({ success: true, aiResult, routed_to: requiresParent ? 'parent' : 'admin' });

  } catch (error: any) {
    console.error('AI trigger error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
