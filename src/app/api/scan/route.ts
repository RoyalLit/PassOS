import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { verifyQRPayload } from '@/lib/crypto/qr-signer';
import { scanSchema } from '@/lib/validators/request-schema';

export async function POST(request: Request) {
  try {
    const profile = await requireRole('guard');
    const supabase = createAdminClient();

    const body = await request.json();
    const result = scanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { qr_payload, scan_type, geo_lat, geo_lng } = result.data;

    // 1. Cryptographic Verification
    const verification = await verifyQRPayload(qr_payload);
    
    // If it's a completely invalid/forged signature, we stop early and don't reveal user data
    if (!verification.success && verification.error === 'invalid') {
      await logScan(supabase, null, profile.id, scan_type, 'invalid_signature');
      return NextResponse.json({ 
        valid: false, 
        result: 'invalid_signature', 
        message: 'Invalid or forged QR code signature' 
      }, { status: 400 });
    }

    // Capture if the signature is expired but otherwise valid
    const isExpired = !verification.success && verification.error === 'expired';
    const pass_id = verification.payload?.pass_id;

    if (!pass_id) {
       return NextResponse.json({ 
        valid: false, 
        result: 'invalid_signature', 
        message: 'QR code contains malformed data' 
      }, { status: 400 });
    }
    // We fetch the student profile even if the token is expired to provide a better UX for the guard
    const { data: pass } = await supabase
      .from('passes')
      .select('*, student:profiles(*)')
      .eq('id', pass_id)
      .single();

    if (!pass) {
      return NextResponse.json({ 
        valid: false, result: 'error', message: 'Pass record not found in database' 
      }, { status: 404 });
    }

    const student = pass.student;

    // 3. Database-level status check (High Priority)
    if (pass.status === 'revoked') {
      await logScan(supabase, pass.id, profile.id, scan_type, 'revoked');
      return NextResponse.json({ 
        valid: false, result: 'revoked', message: 'Pass has been revoked', student 
      });
    }

    // 4. Scan Type Specific Logic
    if (scan_type === 'exit') {
      // ⚠️ STRICT: No exit allowed if expired (either JWT or DB)
      if (isExpired || new Date() > new Date(pass.valid_until)) {
        await logScan(supabase, pass.id, profile.id, scan_type, 'expired');
        await supabase.from('passes').update({ status: 'expired' }).eq('id', pass.id);
        return NextResponse.json({ 
          valid: false, result: 'expired', message: 'Pass has expired. Exit denied.', student 
        });
      }

      if (pass.status !== 'active') {
        const alreadyUsed = pass.status === 'used_exit' || pass.status === 'used_entry';
        await logScan(supabase, pass.id, profile.id, scan_type, alreadyUsed ? 'already_used' : 'error');
        return NextResponse.json({ 
          valid: false, 
          result: alreadyUsed ? 'already_used' : 'error', 
          message: alreadyUsed ? 'Pass already used for exit' : 'Invalid pass state for exit',
          student 
        });
      }

      // Record successful exit — single atomic RPC (1 round-trip, locked transaction)
      const { error: exitRpcError } = await supabase.rpc('process_scan', {
        p_pass_id:     pass.id,
        p_guard_id:    profile.id,
        p_scan_type:   'exit',
        p_scan_result: 'valid',
        p_geo_lat:     geo_lat ?? null,
        p_geo_lng:     geo_lng ?? null,
      });
      if (exitRpcError) throw exitRpcError;

      return NextResponse.json({ valid: true, result: 'valid', pass, student, message: 'Exit granted' });
    }

    if (scan_type === 'entry') {
      // ✅ RELAXED: Entry allowed even if expired to ensure student can return to campus
      const dbExpired = new Date() > new Date(pass.valid_until);
      const lateEntry = isExpired || dbExpired || pass.status === 'expired';

      if (pass.status !== 'used_exit' && pass.status !== 'expired' && pass.status !== 'active') {
        // Note: We allow entry from 'active' if they never scanned out but are coming back (failsafe)
        // or from 'used_exit' (normal) or 'expired' (since they are returning late)
        const alreadyUsed = pass.status === 'used_entry';
        await logScan(supabase, pass.id, profile.id, scan_type, alreadyUsed ? 'already_used' : 'error');
        return NextResponse.json({ 
          valid: false, 
          result: alreadyUsed ? 'already_used' : 'error', 
          message: alreadyUsed ? 'Pass already used for entry' : 'Pass not in valid return state',
          student 
        });
      }

      // Record entry — single atomic RPC (1 round-trip, locked transaction)
      const { error: entryRpcError } = await supabase.rpc('process_scan', {
        p_pass_id:     pass.id,
        p_guard_id:    profile.id,
        p_scan_type:   'entry',
        p_scan_result: lateEntry ? 'late_entry' : 'valid',
        p_geo_lat:     geo_lat ?? null,
        p_geo_lng:     geo_lng ?? null,
      });
      if (entryRpcError) throw entryRpcError;

      return NextResponse.json({ 
        valid: true, 
        result: 'valid', 
        pass, 
        student, 
        message: lateEntry ? 'Welcome back (Late Arrival)' : 'Welcome back' 
      });
    }

    return NextResponse.json({ error: 'Unknown scan type' }, { status: 400 });

  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// logScan helper kept for error/rejection paths where we still do a direct insert
// (the happy-path is now handled by the process_scan RPC in the success branches above)
async function logScan(supabase: any, passId: string | null, guardId: string, scanType: string, result: string, geo?: {lat?: number, lng?: number}) {
  if (!passId) return; // pass_scans.pass_id is NOT NULL — skip logging when no pass exists
  await supabase.from('pass_scans').insert({
    pass_id: passId,
    guard_id: guardId,
    scan_type: scanType,
    scan_result: result,
    geo_lat: geo?.lat,
    geo_lng: geo?.lng,
    device_info: { timestamp: Date.now() },
  });
}
