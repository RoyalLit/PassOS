import * as jose from 'jose';
import { JOSEError, JWTExpired } from 'jose/errors';
import { createHmac, randomBytes } from 'crypto';
import type { QRPayload } from '@/types';

const SIGNING_SECRET = process.env.PASS_SIGNING_SECRET;
if (!SIGNING_SECRET) {
  throw new Error('[qr-signer] PASS_SIGNING_SECRET env var is required but not set.');
}

function getKey() {
  return new TextEncoder().encode(SIGNING_SECRET);
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Sign a QR payload as a compact JWT
 */
export async function signQRPayload(payload: Omit<QRPayload, 'iat'>): Promise<string> {
  const key = getKey();
  const jwt = await new jose.SignJWT({
    pass_id: payload.pass_id,
    student_id: payload.student_id,
    nonce: payload.nonce,
    valid_until: payload.valid_until,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(new Date(payload.valid_until).getTime() / 1000))
    .setIssuer('passos')
    .sign(key);

  return jwt;
}

export type QRVerifyResult = 
  | { success: true; payload: QRPayload }
  | { success: false; error: 'expired' | 'invalid' | 'unknown'; payload?: Partial<QRPayload> };

/**
 * Verify and decode a QR JWT payload with granular error handling
 */
export async function verifyQRPayload(token: string): Promise<QRVerifyResult> {
  try {
    const key = getKey();
    
    // Using a 60s clock tolerance for robustness
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: 'passos',
      clockTolerance: '60s'
    });

    return {
      success: true,
      payload: {
        pass_id: payload.pass_id as string,
        student_id: payload.student_id as string,
        nonce: payload.nonce as string,
        valid_until: payload.valid_until as string,
        iat: payload.iat as number,
      }
    };
    } catch (err) {
      // If expired, we still want to decode it to show the student's name/ID for better UX for the guard
    if (err instanceof JWTExpired) {
      try {
        const decoded = jose.decodeJwt(token);
        return {
          success: false,
          error: 'expired',
          payload: {
            pass_id: decoded.pass_id as string,
            student_id: decoded.student_id as string,
            nonce: decoded.nonce as string,
            valid_until: decoded.valid_until as string,
          }
        };
      } catch {
        return { success: false, error: 'expired' };
      }
    }

    // Other errors (invalid signature, tampered content, etc.)
    return { 
      success: false, 
      error: err instanceof JOSEError ? 'invalid' : 'unknown' 
    };
  }
}

/**
 * Generate an HMAC signature for data integrity
 */
export function hmacSign(data: string): string {
  return createHmac('sha256', SIGNING_SECRET!).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function hmacVerify(data: string, signature: string): boolean {
  const expected = hmacSign(data);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
