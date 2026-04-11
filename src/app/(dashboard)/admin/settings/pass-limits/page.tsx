import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Settings as SettingsIcon, Clock, Sun, Moon, Info } from 'lucide-react';
import { TimeLimitsForm } from '@/components/admin/time-limits-form';
import type { PassTimeLimit } from '@/types';

export default async function PassTimeLimitsPage() {
  await requireRole('admin');
  const supabase = await createServerSupabaseClient();
  
  const { data: limits } = await supabase
    .from('pass_time_limits')
    .select('*')
    .is('tenant_id', null)
    .order('pass_type');
  
  const defaultLimits: PassTimeLimit[] = [
    {
      id: '',
      tenant_id: '',
      pass_type: 'day_outing',
      enabled: true,
      allowed_start: '06:00',
      allowed_end: '22:00',
      max_duration_hours: 12,
      created_at: '',
    },
    {
      id: '',
      tenant_id: '',
      pass_type: 'overnight',
      enabled: false,
      allowed_start: null,
      allowed_end: null,
      max_duration_hours: null,
      created_at: '',
    },
    {
      id: '',
      tenant_id: '',
      pass_type: 'emergency',
      enabled: false,
      allowed_start: null,
      allowed_end: null,
      max_duration_hours: null,
      created_at: '',
    },
    {
      id: '',
      tenant_id: '',
      pass_type: 'medical',
      enabled: false,
      allowed_start: null,
      allowed_end: null,
      max_duration_hours: null,
      created_at: '',
    },
  ];
  
  const mergedLimits = defaultLimits.map(defaultLimit => {
    const saved = (limits || []).find(l => l.pass_type === defaultLimit.pass_type);
    return saved || defaultLimit;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <a 
          href="/admin/settings" 
          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        </a>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pass Time Limits
          </h1>
          <p className="text-muted-foreground">
            Configure allowed hours and duration limits for each pass type
          </p>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-600 mb-1">What are time limits?</p>
          <p className="text-blue-600/80">
            When enabled, students can only submit requests for passes that fall within the allowed time windows.
            For example, a Day Outing with 06:00-22:00 restriction means students can only leave between 6 AM and 10 PM.
          </p>
        </div>
      </div>

      <TimeLimitsForm initialLimits={mergedLimits} />
    </div>
  );
}
