import * as jose from 'jose';

const SECRET = process.env.APPROVAL_TOKEN_SECRET || '';

function getKey() {
  return new TextEncoder().encode(SECRET);
}

interface ApprovalTokenPayload {
  request_id: string;
  parent_id: string;
  student_name: string;
}

/**
 * Generate a signed approval link token (24h expiry)
 */
export async function generateApprovalToken(
  payload: ApprovalTokenPayload
): Promise<string> {
  const key = getKey();
  const jwt = await new jose.SignJWT({
    request_id: payload.request_id,
    parent_id: payload.parent_id,
    student_name: payload.student_name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setIssuer('passos-approval')
    .sign(key);

  return jwt;
}

/**
 * Verify and decode an approval token
 */
export async function verifyApprovalToken(
  token: string
): Promise<ApprovalTokenPayload | null> {
  try {
    const key = getKey();
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: 'passos-approval',
    });

    return {
      request_id: payload.request_id as string,
      parent_id: payload.parent_id as string,
      student_name: payload.student_name as string,
    };
  } catch {
    return null;
  }
}

/**
 * Build the full approval URL
 */
export function buildApprovalUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/approve/${token}`;
}
