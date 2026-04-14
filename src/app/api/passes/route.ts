import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { signQRPayload, generateNonce } from '@/lib/crypto/qr-signer';
import { requireRole } from '@/lib/auth/rbac';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip');
}

// Internal Pass Generator logic that avoids loopback fetches
export async function generatePass(request_id: string) {
  try {
    if (!request_id) {
      throw new Error('request_id required');
    }

    console.log('[generatePass] Starting for request_id:', request_id);

    const supabase = createAdminClient();

    // Verify request is approved and pass not already generated
    const { data: passReq, error: reqError } = await supabase
      .from('pass_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqError) {
      console.error('[generatePass] Error fetching request:', reqError);
      throw new Error('Failed to fetch request: ' + reqError.message);
    }
    
    console.log('[generatePass] Request data:', passReq);

    if (!passReq || passReq.status !== 'approved') {
      console.log('[generatePass] Request status:', passReq?.status);
      throw new Error('Request not approved');
    }

    // Get tenant_id from request, or fallback to student's tenant
    let tenantId = passReq.tenant_id;
    if (!tenantId) {
      console.log('[generatePass] No tenant_id on request, fetching from student profile...');
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', passReq.student_id)
        .single();
      tenantId = studentProfile?.tenant_id || '00000000-0000-0000-0000-000000000001'; // Default test tenant
      console.log('[generatePass] Using tenant_id:', tenantId);
    }

    const { data: existingPass } = await supabase
      .from('passes')
      .select('id')
      .eq('request_id', request_id)
      .maybeSingle();

    console.log('[generatePass] Existing pass check:', existingPass);

    if (existingPass) {
      throw new Error('Pass already exists for this request');
    }

    // Generate secure QR payload
    const nonce = generateNonce();
    // Valid from departure time, valid until return by. Add 1 hour buffer to expiry.
    const validUntil = new Date(new Date(passReq.return_by).getTime() + 60 * 60 * 1000).toISOString();
    
    console.log('[generatePass] Getting UUID...');
    
    // We need a pre-generated ID to sign
    const { data: idData, error: uuidError } = await supabase.rpc('get_uuid').single();
    console.log('[generatePass] UUID result:', idData, 'Error:', uuidError);
    
    const generatedId = (idData as string) || crypto.randomUUID();
    console.log('[generatePass] Generated ID:', generatedId);

    console.log('[generatePass] Signing payload...');
    const signedPayload = await signQRPayload({
      pass_id: generatedId,
      student_id: passReq.student_id,
      nonce: nonce,
      valid_until: validUntil,
    });

    console.log('[generatePass] Inserting pass with tenant_id:', tenantId);
    // Store the newly issued pass
    const { data: newPass, error: passError } = await supabase
      .from('passes')
      .insert({
        id: generatedId,
        request_id: passReq.id,
        student_id: passReq.student_id,
        tenant_id: tenantId,
        qr_payload: signedPayload,
        qr_nonce: nonce,
        valid_from: passReq.departure_at,
        valid_until: validUntil,
        status: 'active',
      })
      .select()
      .single();

    console.log('[generatePass] Pass insert result:', newPass, 'Error:', passError);
    
    if (passError) throw passError;

    // Update student state active pass ID
    console.log('[generatePass] Updating student_states...');
    const { error: stateError } = await supabase
      .from('student_states')
      .update({ active_pass_id: newPass.id })
      .eq('student_id', passReq.student_id);
    
    console.log('[generatePass] Student state update error:', stateError);

    console.log('[generatePass] SUCCESS - Pass generated:', newPass.id);
    return newPass;
  } catch (error: unknown) {
    console.error('Pass generation error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const clientIp = getClientIp(request.headers) || 'unknown';
    const rateLimit = await checkRateLimit(`passes_post:${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Require admin role for direct pass generation API calls
    await requireRole('admin');
    
    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
    }
    const pass = await generatePass(request_id);
    return NextResponse.json({ success: true, pass });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
