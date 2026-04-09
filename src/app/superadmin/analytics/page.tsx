import { requireSuperAdmin } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { BarChart3, TrendingUp, Users, Building2 } from 'lucide-react';

export default async function SuperadminAnalytics() {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const [
    { data: tenants },
    { data: profiles },
    { data: passes },
    { data: requests },
    { data: fraudFlags },
  ] = await Promise.all([
    admin.from('tenants').select('id, status, plan, created_at'),
    admin.from('profiles').select('id, role, created_at'),
    admin.from('passes').select('id, status, created_at'),
    admin.from('pass_requests').select('id, status, created_at'),
    admin.from('fraud_flags').select('id, created_at'),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentPasses = passes?.filter(p => new Date(p.created_at) >= sevenDaysAgo) || [];
  const recentRequests = requests?.filter(r => new Date(r.created_at) >= sevenDaysAgo) || [];
  const recentSignups = profiles?.filter(p => new Date(p.created_at) >= thirtyDaysAgo) || [];
  const activePasses = passes?.filter(p => p.status === 'active' || p.status === 'used_exit') || [];

  const planDistribution = (tenants || []).reduce((acc, t) => {
    acc[t.plan] = (acc[t.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const roleDistribution = (profiles || []).reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const requestStatusDistribution = (requests || []).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const cards = [
    { label: 'Total Universities', value: tenants?.length || 0, icon: Building2, color: 'text-blue-500', bg: 'hover:border-blue-500/30' },
    { label: 'Total Users', value: profiles?.length || 0, icon: Users, color: 'text-green-500', bg: 'hover:border-green-500/30' },
    { label: 'Active Passes', value: activePasses.length, icon: TrendingUp, color: 'text-purple-500', bg: 'hover:border-purple-500/30' },
    { label: 'Total Requests', value: requests?.length || 0, icon: BarChart3, color: 'text-orange-500', bg: 'hover:border-orange-500/30' },
    { label: 'This Week (Passes)', value: recentPasses.length, icon: TrendingUp, color: 'text-cyan-500', bg: 'hover:border-cyan-500/30' },
    { label: 'This Week (Signups)', value: recentSignups.length, icon: Users, color: 'text-pink-500', bg: 'hover:border-pink-500/30' },
    { label: 'Fraud Flags', value: fraudFlags?.length || 0, icon: BarChart3, color: 'text-red-500', bg: 'hover:border-red-500/30' },
    { label: 'Approval Rate', value: requests?.length ? `${Math.round(((requestStatusDistribution['approved'] || 0) / requests.length) * 100)}%` : '0%', icon: TrendingUp, color: 'text-emerald-500', bg: 'hover:border-emerald-500/30' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground">
          Aggregate metrics across all universities
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border transition-all ${card.bg}`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{card.label}</p>
                <Icon size={16} className={card.color} />
              </div>
              <p className={`text-3xl font-black tracking-tighter ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-foreground mb-4">Users by Role</h3>
          <div className="space-y-3">
            {Object.entries(roleDistribution).map(([role, count]) => {
              const pct = profiles?.length ? Math.round((count / profiles.length) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-foreground">{role}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-foreground mb-4">Universities by Plan</h3>
          <div className="space-y-3">
            {Object.entries(planDistribution).map(([plan, count]) => {
              const pct = tenants?.length ? Math.round((count / tenants.length) * 100) : 0;
              const colors: Record<string, string> = {
                free: 'bg-gray-500', starter: 'bg-blue-500', pro: 'bg-purple-500', enterprise: 'bg-amber-500',
              };
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-foreground">{plan}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${colors[plan] || 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-foreground mb-4">Requests by Status</h3>
          <div className="space-y-3">
            {Object.entries(requestStatusDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const pct = requests?.length ? Math.round((count / requests.length) * 100) : 0;
                const colors: Record<string, string> = {
                  approved: 'bg-green-500', rejected: 'bg-red-500', pending: 'bg-yellow-500',
                  cancelled: 'bg-gray-500',
                };
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground text-xs">{status.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${colors[status] || 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
