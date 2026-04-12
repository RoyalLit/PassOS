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
      
      // Use atomic UPDATE with row count check to prevent race conditions
      const { data: updateResult, error: updateError } = await supabase
        .from('approvals')
        .update({ 
          decision, 
          reason, 
          ip_address: getClientIp(request.headers) 
        })
        .eq('token', token)
        .eq('decision', 'escalated') // Only update if still in escalated state
        .select('id'); // Return the updated row
      
      if (updateError) throw updateError;
      
      // Check if the update actually affected a row
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
    }

    // Route 2: Admin or Warden Approval via Session
    const userProfile = await requireRole('admin', 'warden');
    approver_id = userProfile.id;
    approver_type = userProfile.role;

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
      ip_address: getClientIp(request.headers),
    });

    if (approvalError) {
      console.error('[Approval] Insert failure:', approvalError);
      return NextResponse.json({ error: 'Failed to record approval' }, { status: 500 });
    }

    const finalStatus = decision === 'approved' ? 'approved' : 'rejected';
    await supabase.from('pass_requests').update({ status: finalStatus }).eq('id', request_id);

    // If approved, trigger pass generation synchronously
    if (finalStatus === 'approved') {
      console.log('Spawning pass internally for request:', request_id);
      try {
        await generatePass(request_id);
      } catch (e: unknown) {
        console.error('Pass Generation crashed:', e);
        // We still return success: true because the request WAS approved, but warn about pass generation
        return NextResponse.json({ 
          success: true, 
          warning: 'Pass generation failed. Please generate manually or retry.',
          final_status: finalStatus 
        });
      }
    } else {
      console.log('Request was rejected, no pass generated');
    }

    return NextResponse.json({ success: true, final_status: finalStatus });

  } catch (error: unknown) {
    console.error('Approval handler error:', error);
    // Mask detailed error messages for 500s
    const isAuthError = error instanceof Error && error.message.includes('Unauthorized');
    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : 'An unexpected server error occurred' },
      { status: isAuthError ? 403 : 500 }
    );
  }
}

