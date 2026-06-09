import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildApprovalUrl } from '@/lib/crypto/approval-tokens';
import { APP_NAME } from '@/lib/constants';

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || 'noreply@passos.app';

function getResend(): Resend | null {
  if (!resendApiKey) return null;
  return new Resend(resendApiKey);
}

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    const to = Array.isArray(params.to) ? params.to : [params.to];
    if (to.length === 0) return false;

    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${fromAddress}>`,
      to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Unexpected error:', err);
    return false;
  }
}

export async function checkEmailPreference(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.metadata) return true;

  const meta = profile.metadata as Record<string, unknown>;
  return meta.notifications_email !== false;
}

function formatRequestType(type: string): string {
  if (!type) return '';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border-top:4px solid #18181b;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
<tr><td style="padding:32px 24px 8px">
<h1 style="margin:0;font-size:22px;color:#18181b;letter-spacing:-0.3px;font-weight:700">${APP_NAME}</h1>
</td></tr>
<tr><td style="padding:8px 24px 24px;color:#3f3f46;font-size:15px;line-height:1.6">
${content}
</td></tr>
<tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7">
<p style="margin:0;font-size:12px;color:#a1a1aa">${APP_NAME} &middot; Smart Gate Pass &amp; Student Mobility System</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

export async function sendParentApprovalEmail(params: {
  parentUserId: string;
  parentEmail: string;
  parentName: string;
  studentName: string;
  requestType: string;
  destination: string;
  departureAt: string;
  returnBy: string;
  reason: string;
  approvalToken: string;
}): Promise<boolean> {
  if (!(await checkEmailPreference(params.parentUserId))) return false;
  const url = buildApprovalUrl(params.approvalToken);

  const displayRequestType = formatRequestType(params.requestType);
  const formattedDeparture = formatDate(params.departureAt);
  const formattedReturn = formatDate(params.returnBy);

  const html = baseLayout(`
<p style="margin-top:0">Hi ${params.parentName},</p>
<p><strong>${params.studentName}</strong> has requested a <strong>${displayRequestType}</strong> pass and requires your authorization.</p>

<table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;margin:20px 0;font-size:14px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
<tr style="background:#f8f8f8;border-bottom:1px solid #e4e4e7"><td style="color:#71717a;width:120px;font-weight:500">Destination</td><td style="color:#18181b;font-weight:600">${params.destination}</td></tr>
<tr style="border-bottom:1px solid #e4e4e7"><td style="color:#71717a;font-weight:500">Departure</td><td style="color:#18181b;font-weight:600">${formattedDeparture}</td></tr>
<tr style="border-bottom:1px solid #e4e4e7"><td style="color:#71717a;font-weight:500">Return By</td><td style="color:#18181b;font-weight:600">${formattedReturn}</td></tr>
<tr><td style="color:#71717a;font-weight:500">Reason</td><td style="color:#18181b">${params.reason}</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
<tr>
<td align="center">
<a href="${url}" style="display:inline-block;padding:12px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500">Review &amp; Decide</a>
</td>
</tr>
</table>

<p style="font-size:13px;color:#71717a;line-height:1.4;margin-top:24px">This link expires in 24 hours. If you did not expect this request, you can safely ignore this email.</p>
`);

  return sendEmail({
    to: params.parentEmail,
    subject: `${params.studentName} needs your approval for a ${displayRequestType} pass`,
    html,
  });
}

export async function sendPassApprovedEmail(params: {
  userId: string;
  email: string;
  name: string;
  requestType: string;
  validFrom: string;
  validUntil: string;
}): Promise<boolean> {
  if (!(await checkEmailPreference(params.userId))) return false;

  const displayRequestType = formatRequestType(params.requestType);
  const formattedFrom = formatDate(params.validFrom);
  const formattedUntil = formatDate(params.validUntil);

  const html = baseLayout(`
<p style="margin-top:0">Hi ${params.name},</p>
<p>Your <strong>${displayRequestType}</strong> pass has been approved.</p>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;margin:16px 0;display:inline-block">
  <span style="color:#16a34a;font-weight:600;font-size:13px">&bull; Pass Approved &amp; Active</span>
</div>

<table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;margin:20px 0;font-size:14px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
<tr style="background:#f8f8f8;border-bottom:1px solid #e4e4e7"><td style="color:#71717a;width:120px;font-weight:500">Valid From</td><td style="color:#18181b;font-weight:600">${formattedFrom}</td></tr>
<tr><td style="color:#71717a;font-weight:500">Valid Until</td><td style="color:#18181b;font-weight:600">${formattedUntil}</td></tr>
</table>

<p style="font-size:14px;color:#52525b">Please present the QR code on your mobile dashboard to the security guard when exiting and returning to campus.</p>
`);

  return sendEmail({
    to: params.email,
    subject: `Your ${displayRequestType} pass has been approved`,
    html,
  });
}

export async function sendPassRejectedEmail(params: {
  userId: string;
  email: string;
  name: string;
  requestType: string;
  reason?: string;
}): Promise<boolean> {
  if (!(await checkEmailPreference(params.userId))) return false;

  const displayRequestType = formatRequestType(params.requestType);

  const html = baseLayout(`
<p style="margin-top:0">Hi ${params.name},</p>
<p>Your <strong>${displayRequestType}</strong> pass request was not approved.</p>

<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin:16px 0;display:inline-block">
  <span style="color:#dc2626;font-weight:600;font-size:13px">&bull; Pass Request Rejected</span>
</div>

${params.reason ? `
<div style="background:#fafafa;border-left:4px solid #d4d4d8;padding:16px;margin:20px 0;font-size:14px;border-radius:0 8px 8px 0">
  <strong style="color:#27272a;display:block;margin-bottom:4px">Reason provided by warden/admin:</strong>
  <span style="color:#52525b;line-height:1.5">${params.reason}</span>
</div>
` : ''}

<p style="font-size:14px;color:#71717a;margin-top:20px">If you believe this is an error or need further clarification, please contact your hostel warden or administration office.</p>
`);

  return sendEmail({
    to: params.email,
    subject: `Your ${displayRequestType} pass request was not approved`,
    html,
  });
}

export async function sendPassApprovedToParent(params: {
  parentUserId: string;
  parentEmail: string;
  parentName: string;
  studentName: string;
  requestType: string;
  validFrom: string;
  validUntil: string;
}): Promise<boolean> {
  if (!(await checkEmailPreference(params.parentUserId))) return false;

  const displayRequestType = formatRequestType(params.requestType);
  const formattedFrom = formatDate(params.validFrom);
  const formattedUntil = formatDate(params.validUntil);

  const html = baseLayout(`
<p style="margin-top:0">Hi ${params.parentName},</p>
<p>This is to inform you that <strong>${params.studentName}</strong>'s request for a <strong>${displayRequestType}</strong> pass has been approved.</p>

<table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;margin:20px 0;font-size:14px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
<tr style="background:#f8f8f8;border-bottom:1px solid #e4e4e7"><td style="color:#71717a;width:120px;font-weight:500">Valid From</td><td style="color:#18181b;font-weight:600">${formattedFrom}</td></tr>
<tr><td style="color:#71717a;font-weight:500">Valid Until</td><td style="color:#18181b;font-weight:600">${formattedUntil}</td></tr>
</table>

<p style="font-size:14px;color:#71717a">You can track their return status directly from the Parent Portal.</p>
`);

  return sendEmail({
    to: params.parentEmail,
    subject: `${params.studentName}'s ${displayRequestType} pass has been approved`,
    html,
  });
}

export async function sendOverdueAlertEmail(params: {
  wardenUserId: string;
  email: string;
  name: string;
  studentName: string;
  hostel: string;
  roomNumber: string;
  validUntil: string;
  overdueMinutes: number;
}): Promise<boolean> {
  if (!(await checkEmailPreference(params.wardenUserId))) return false;

  const formattedUntil = formatDate(params.validUntil);

  const html = baseLayout(`
<p style="margin-top:0">Hi ${params.name},</p>

<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin:16px 0;display:inline-block">
  <span style="color:#dc2626;font-weight:600;font-size:13px">&bull; Overdue Alert</span>
</div>

<p><strong>${params.studentName}</strong> (Hostel: ${params.hostel}${params.roomNumber ? `, Room: ${params.roomNumber}` : ''}) has not returned to campus and is currently overdue.</p>

<table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;margin:20px 0;font-size:14px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
<tr style="background:#f8f8f8;border-bottom:1px solid #e4e4e7"><td style="color:#71717a;width:140px;font-weight:500">Scheduled Return</td><td style="color:#18181b;font-weight:600">${formattedUntil}</td></tr>
<tr><td style="color:#71717a;font-weight:500">Overdue Duration</td><td style="color:#dc2626;font-weight:600">${params.overdueMinutes} minutes</td></tr>
</table>

<p style="font-size:14px;color:#52525b">Please initiate standard follow-up procedures as per institution guidelines.</p>
`);

  return sendEmail({
    to: params.email,
    subject: `⚠ Overdue: ${params.studentName} has not returned to campus`,
    html,
  });
}
