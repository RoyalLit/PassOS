import { createClient } from '@/lib/supabase/server';
import { notifyUser, formatNotificationTemplate } from '@/lib/push/notifications';
import type { EscalationRule, EscalationLog, EscalationEventType, EscalationPriority } from '@/types';

interface EscalationContext {
  studentId: string;
  passId?: string;
  eventType: EscalationEventType;
  tenantId: string;
  details?: Record<string, unknown>;
}

interface EscalationResult {
  success: boolean;
  logId?: string;
  notificationsSent?: number;
  errors?: string[];
}

export async function triggerEscalation(context: EscalationContext): Promise<EscalationResult> {
  const supabase = await createClient();
  const { studentId, passId, eventType, tenantId, details } = context;

  const result: EscalationResult = { success: true, notificationsSent: 0, errors: [] };

  try {
    const { data: rules, error: rulesError } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      throw new Error(`Failed to fetch escalation rules: ${rulesError.message}`);
    }

    if (!rules || rules.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    for (const rule of rules as EscalationRule[]) {
      if (rule.threshold_minutes > 0) {
        const shouldTrigger = await checkThreshold(rule, context);
        if (!shouldTrigger) continue;
      }

      const logId = await createEscalationLog(supabase, rule, context);
      result.logId = logId;

      const recipients = await getEscalationRecipients(supabase, studentId, tenantId, rule);

      for (const recipient of recipients) {
        const notificationResult = await sendEscalationNotification(recipient, rule, context);
        if (notificationResult.success) {
          result.notificationsSent!++;
        } else {
          result.errors?.push(notificationResult.error || 'Unknown error');
        }
      }

      await updateEscalationActions(supabase, logId, 'notifications_sent', recipients.map(r => r.user_id));

      if (rule.auto_action) {
        await executeAutoAction(supabase, rule, context);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, errors: [errorMessage] };
  }
}

async function checkThreshold(rule: EscalationRule, context: EscalationContext): Promise<boolean> {
  if (!context.passId) return true;

  const supabase = await createClient();

  if (rule.event_type === 'pass_overdue') {
    const { data: pass } = await supabase
      .from('passes')
      .select('valid_until')
      .eq('id', context.passId)
      .single();

    if (!pass) return false;

    const validUntil = new Date(pass.valid_until);
    const now = new Date();
    const minutesOverdue = Math.floor((now.getTime() - validUntil.getTime()) / 60000);

    return minutesOverdue >= rule.threshold_minutes;
  }

  return true;
}

async function createEscalationLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rule: EscalationRule,
  context: EscalationContext
): Promise<string> {
  const { data, error } = await supabase.rpc('create_escalation_log', {
    p_tenant_id: context.tenantId,
    p_student_id: context.studentId,
    p_pass_id: context.passId,
    p_rule_id: rule.id,
    p_trigger_event: rule.event_type,
    p_trigger_details: context.details || {},
    p_priority: rule.priority,
  });

  if (error) {
    throw new Error(`Failed to create escalation log: ${error.message}`);
  }

  return data;
}

async function getEscalationRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  tenantId: string,
  rule: EscalationRule
): Promise<Array<{ user_id: string; role: string }>> {
  const recipients: Array<{ user_id: string; role: string }> = [];

  if (rule.notify_student) {
    recipients.push({ user_id: studentId, role: 'student' });
  }

  if (rule.notify_parents) {
    const { data: parents } = await supabase
      .from('parent_student_relations')
      .select('parent_id')
      .eq('student_id', studentId);

    if (parents) {
      for (const parent of parents) {
        recipients.push({ user_id: parent.parent_id, role: 'parent' });
      }
    }
  }

  if (rule.notify_wardens) {
    const { data: wardens } = await supabase
      .from('hostel_assignments')
      .select('hostel_id')
      .eq('student_id', studentId);

    if (wardens && wardens.length > 0) {
      const hostels = wardens.map(w => w.hostel_id);
      const { data: wardenAssignments } = await supabase
        .from('warden_assignments')
        .select('warden_id')
        .in('hostel_id', hostels);

      if (wardenAssignments) {
        for (const wa of wardenAssignments) {
          recipients.push({ user_id: wa.warden_id, role: 'warden' });
        }
      }
    }
  }

  if (rule.notify_admins) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        recipients.push({ user_id: admin.id, role: 'admin' });
      }
    }
  }

  return recipients;
}

async function sendEscalationNotification(
  recipient: { user_id: string; role: string },
  rule: EscalationRule,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { data: student } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', context.studentId)
    .single();

  const studentName = student?.full_name || 'Student';
  const passType = (context.details?.pass_type as string) || 'pass';
  const overdueMinutes = context.details?.overdue_minutes as number;

  let title: string;
  let body: string;

  switch (context.eventType) {
    case 'pass_overdue':
      title = '⚠️ Pass Overdue Alert';
      body = overdueMinutes
        ? `${studentName}'s pass is ${overdueMinutes} minutes overdue. Immediate attention required.`
        : `${studentName}'s pass has expired. Please check on their status.`;
      break;
    case 'rapid_requests':
      title = '🚨 Rapid Request Pattern';
      body = `${studentName} has made multiple requests in a short time. Please review their activity.`;
      break;
    case 'suspicious_pattern':
      title = '🚨 Suspicious Activity Detected';
      body = `Suspicious pattern detected for ${studentName}. Please investigate.`;
      break;
    default:
      title = `Escalation: ${rule.name}`;
      body = rule.description || 'An escalation event has been triggered.';
  }

  const result = await notifyUser(recipient.user_id, 'escalation', {
    title,
    body,
    data: {
      escalationRuleId: rule.id,
      studentId: context.studentId,
      passId: context.passId,
      eventType: context.eventType,
      priority: rule.priority,
    },
    tag: `escalation-${context.eventType}`,
  });

  return { success: result.sent > 0, error: result.errors?.join(', ') };
}

async function updateEscalationActions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  logId: string,
  action: string,
  recipients: string[]
): Promise<void> {
  await supabase.rpc('update_escalation_actions', {
    p_log_id: logId,
    p_action: action,
    p_recipients: recipients,
  });
}

async function executeAutoAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rule: EscalationRule,
  context: EscalationContext
): Promise<void> {
  switch (rule.auto_action) {
    case 'flag_student':
      await supabase
        .from('profiles')
        .update({ 
          is_flagged: true, 
          flag_reason: `Auto-flagged: ${rule.name}` 
        })
        .eq('id', context.studentId);
      break;

    case 'revoke_pass':
      if (context.passId) {
        await supabase
          .from('passes')
          .update({ status: 'revoked' })
          .eq('id', context.passId);
      }
      break;

    case 'notify_guard':
      const { data: guards } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'guard');

      if (guards) {
        for (const guard of guards) {
          await notifyUser(guard.id, 'escalation', {
            title: '🚨 Overdue Student Alert',
            body: 'A student has not returned on time. Please be on alert.',
            data: { studentId: context.studentId, passId: context.passId },
            tag: 'guard-alert',
          });
        }
      }
      break;
  }
}

export async function acknowledgeEscalation(
  logId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('acknowledge_escalation', {
    p_log_id: logId,
    p_acknowledged_by: userId,
  });

  return !error;
}

export async function resolveEscalation(
  logId: string,
  userId: string,
  notes?: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('resolve_escalation', {
    p_log_id: logId,
    p_resolved_by: userId,
    p_notes: notes,
  });

  return !error;
}

export async function getActiveEscalations(tenantId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('escalation_logs')
    .select(`
      *,
      student:profiles!student_id(id, full_name, hostel, room_number)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'acknowledged'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch escalations: ${error.message}`);
  }

  return data || [];
}

export async function checkPassOverdueAndEscalate(
  passId: string,
  studentId: string,
  tenantId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: pass } = await supabase
    .from('passes')
    .select('valid_until, status')
    .eq('id', passId)
    .single();

  if (!pass || pass.status !== 'active') return;

  const validUntil = new Date(pass.valid_until);
  const now = new Date();

  if (now > validUntil) {
    const overdueMinutes = Math.floor((now.getTime() - validUntil.getTime()) / 60000);

    await triggerEscalation({
      studentId,
      passId,
      eventType: 'pass_overdue',
      tenantId,
      details: {
        valid_until: pass.valid_until,
        overdue_minutes: overdueMinutes,
      },
    });

    await supabase
      .from('student_states')
      .update({ current_state: 'overdue' })
      .eq('student_id', studentId);
  }
}
