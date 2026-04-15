import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// This route is called by Vercel Cron every 5 minutes.
// Secured via CRON_SECRET env var.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. Expire active passes that have passed their valid_until
  const { data: expiredPasses, error: expireError } = await supabase
    .from('passes')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('valid_until', now)
    .select('id, student_id, tenant_id');

  if (expireError) {
    console.error('[cron/expire-passes] Error expiring passes:', expireError);
  }

  // 2. Find students who exited but haven't returned past valid_until
  const { data: overdueStudents, error: overdueError } = await supabase
    .from('passes')
    .select('student_id, tenant_id, valid_until')
    .eq('status', 'used_exit')
    .lt('valid_until', now);

  if (overdueError) {
    console.error('[cron/expire-passes] Error finding overdue students:', overdueError);
  }

  const overdueCount = overdueStudents?.length ?? 0;

  if (overdueStudents && overdueStudents.length > 0) {
    const studentIds = overdueStudents.map(s => s.student_id);

    // 2a. Batch-update all overdue student states in a single query (was N sequential updates)
    await supabase
      .from('student_states')
      .update({ current_state: 'overdue', updated_at: now })
      .in('student_id', studentIds);

    // 2b. Batch-fetch all student profiles with parent links in one query
    const { data: studentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, parent_id')
      .in('id', studentIds)
      .not('parent_id', 'is', null);

    if (studentProfiles && studentProfiles.length > 0) {
      const parentIds = studentProfiles.map(p => p.parent_id!);

      // 2c. Dedup check: find parents already notified in the last hour (single query)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentNotifs } = await supabase
        .from('notifications')
        .select('user_id')
        .in('user_id', parentIds)
        .like('title', '⚠️%overdue%')
        .gte('created_at', oneHourAgo);

      const alreadyNotifiedParentIds = new Set(recentNotifs?.map(n => n.user_id) ?? []);

      // 2d. Build and batch-insert all notifications in one query
      const studentMap = new Map(overdueStudents.map(s => [s.student_id, s]));
      const notificationsToInsert = studentProfiles
        .filter(p => !alreadyNotifiedParentIds.has(p.parent_id!))
        .map(p => {
          const overdueData = studentMap.get(p.id);
          return {
            user_id: p.parent_id!,
            tenant_id: overdueData?.tenant_id,
            channel: 'in_app',
            title: `⚠️ ${p.full_name} is overdue`,
            body: `${p.full_name}'s pass expired at ${new Date(overdueData?.valid_until ?? now).toLocaleTimeString()} but they have not returned to campus yet.`,
            data: { student_id: p.id, type: 'overdue_alert' },
            read: false,
          };
        });

      if (notificationsToInsert.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);
        if (notifError) {
          console.error('[cron/expire-passes] Failed to insert overdue notifications:', notifError);
        }
      }
    }
  }

  console.log(`[cron/expire-passes] Expired: ${expiredPasses?.length ?? 0}, Overdue: ${overdueCount}`);

  return NextResponse.json({
    success: true,
    expired: expiredPasses?.length ?? 0,
    overdue: overdueCount,
    timestamp: now,
  });
}
