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

  // 2. Mark students as overdue — those who exited but haven't returned past valid_until
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
    // Mark student states as overdue
    for (const s of overdueStudents) {
      await supabase
        .from('student_states')
        .update({ current_state: 'overdue', updated_at: now })
        .eq('student_id', s.student_id);

      // Create an in-app notification for the parent (if any)
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, parent_id')
        .eq('id', s.student_id)
        .single();

      if (studentProfile?.parent_id) {
        // Check if we already sent a notification in the last hour to avoid spam
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: existingNotifs } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', studentProfile.parent_id)
          .eq('title', `⚠️ ${studentProfile.full_name} is overdue`)
          .gte('created_at', oneHourAgo);

        if (!existingNotifs || existingNotifs === 0) {
          await supabase.from('notifications').insert({
            user_id: studentProfile.parent_id,
            tenant_id: s.tenant_id,
            channel: 'in_app',
            title: `⚠️ ${studentProfile.full_name} is overdue`,
            body: `${studentProfile.full_name}'s pass expired at ${new Date(s.valid_until).toLocaleTimeString()} but they have not returned to campus yet.`,
            data: { student_id: s.student_id, type: 'overdue_alert' },
            read: false,
          });
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
