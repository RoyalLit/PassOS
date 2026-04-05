import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Protect this route by requiring a cron secret
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

// GET /api/alerts
// Triggered by n8n cron every 15 mins to check for overdue students and update state
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Find active passes where valid_until has passed and student hasn't entered
    // In our DB, "used_exit" means they left but haven't returned.
    const now = new Date().toISOString();
    
    // We update passes to 'expired' and student_states to 'overdue'
    // First find them
    const { data: overduePasses, error: findError } = await supabase
      .from('passes')
      .select('id, student_id, request_id, valid_until')
      .eq('status', 'used_exit') // Left campus
      .lt('valid_until', now);   // Expiry time has passed

    if (findError) throw findError;

    if (!overduePasses || overduePasses.length === 0) {
      return NextResponse.json({ success: true, message: 'No overdue passes found', count: 0 });
    }

    const studentIds = overduePasses.map(p => p.student_id);

    // 2. Update states
    const { error: stateError } = await supabase
      .from('student_states')
      .update({ current_state: 'overdue' })
      .in('student_id', studentIds)
      // Only update if they are still marked as outside
      .eq('current_state', 'outside');
      
    if (stateError) console.error('Failed to update student states:', stateError);

    // 3. Mark passes as expired
    const { error: passError } = await supabase
      .from('passes')
      .update({ status: 'expired' })
      .in('id', overduePasses.map(p => p.id));

    if (passError) console.error('Failed to expire passes:', passError);

    // 4. Trigger n8n webhook for escalation
    const webhookUrl = process.env.N8N_WEBHOOK_BASE_URL;
    if (webhookUrl) {
      await fetch(`${webhookUrl}/overdue-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: now,
          count: overduePasses.length,
          students: studentIds, // n8n can query Supabase for full profile
        }),
      }).catch(e => console.error('Failed to trigger n8n alert webhook:', e));
    }

    return NextResponse.json({ 
      success: true, 
      count: overduePasses.length,
      message: `Marked ${overduePasses.length} students as overdue.`
    });

  } catch (error: any) {
    console.error('Alert processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
