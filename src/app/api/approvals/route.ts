import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyApprovalToken } from '@/lib/crypto/approval-tokens';
import { requireRole } from '@/lib/auth/rbac';
import { approvalSchema } from '@/lib/validators/request-schema';
import { generatePass } from '@/app/api/passes/route';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip');
}

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const clientIp = getClientIp(request.headers) || 'unknown';
    const rateLimit = await checkRateLimit(`approval:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const result = approvalSchema.safeParse(body);
    
    if (!result.success) {
      console.error('[Approval] Validation failed:', result.error.format());
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: result.error.issues.map(e => e.message) 
      }, { status: 400, headers: getRateLimitHeaders(rateLimit) });
    }

    const { request_id, decision, reason, token } = result.data;
    // Single admin client for the entire handler
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

    // Route 1: Parent Approval via Token (unauthenticated — token IS the credential)
    if (token) {
      const payload = await verifyApprovalToken(token);
      if (!payload || payload.request_id !== request_id) {
        return NextResponse.json({ error: 'Invalid or expired approval token' }, { status: 403 });
      }
      
      // Use atomic UPDATE with row count check to prevent race conditions on double-click
      const { data: updateResult, error: updateError } = await supabase
        .from('approvals')
        .update({ 
          decision, 
          reason, 
          ip_address: clientIp 
        })
        .eq('token', token)
        .eq('decision', 'escalated') // Only update if still in escalated state
        .select('id'); // Return the updated row
      
      if (updateError) throw updateError;
      
      // If no row was updated, the link was already used
      if (!updateResult || updateResult.length === 0) {
        return NextResponse.json({ error: 'Link already used' }, { status: 400 });
      }
        
      // Advance the core request
      const nextStatus = decision === 'approved' ? 'admin_pending' : 'parent_rejected';
      await supabase
        .from('pass_requests')
        .update({ status: nextStatus })
        .eq('id', request_id);

      return NextResponse.json({ success: true, next_status: nextStatus });
    } else {
      // Route 2: Admin or Warden Approval via Session (explicitly in else block)
      const userProfile = await requireRole('admin', 'warden');
      const approver_id = userProfile.id;
      const approver_type = userProfile.role;

      // Must be in a pending state
      if (!['pending', 'admin_pending', 'parent_pending', 'parent_approved'].includes(passReq.status)) {
        return NextResponse.json({ error: 'Request not in approvable state' }, { status: 400 });
      }

      // Record admin approval
      const { error: approvalError } = await supabase.from('approvals').insert({
        request_id,
        tenant_id: passReq.tenant_id,
        approver_id,
        approver_type,
        decision,
        reason,
        ip_address: clientIp,
      });

      if (approvalError) {
        console.error('[Approval] Insert failure:', approvalError);
        return NextResponse.json({ error: 'Failed to record approval' }, { status: 500 });
      }

      const finalStatus = decision === 'approved' ? 'approved' : 'rejected';
      await supabase.from('pass_requests').update({ status: finalStatus }).eq('id', request_id);

      // If approved, trigger pass generation synchronously
      if (finalStatus === 'approved') {
        try {
          await generatePass(request_id);
        } catch (e: unknown) {
          console.error('Pass Generation crashed:', e);
          // Request WAS approved, but warn about pass generation failure
          return NextResponse.json({ 
            success: true, 
            warning: 'Pass generation failed. Please generate manually or retry.',
            final_status: finalStatus 
          });
        }
      }

      return NextResponse.json({ success: true, final_status: finalStatus });
    }
  } catch (error: unknown) {
    console.error('Approval handler error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const isAuthError = errorMsg.includes('Unauthorized');
    const isForbiddenError = errorMsg.includes('Forbidden');
    
    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : (isForbiddenError ? 'Forbidden' : 'An unexpected server error occurred') },
      { status: isAuthError ? 401 : (isForbiddenError ? 403 : 500) }
    );
  }
}
