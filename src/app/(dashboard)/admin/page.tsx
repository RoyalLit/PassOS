import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ApprovalPanel } from '@/components/admin/approval-panel';
import { SearchInput } from '@/components/ui/search-input';
import { RealtimeRefresh } from '@/components/common/realtime-refresh';
import { ActivityCharts } from '@/components/admin/activity-charts';
import { QuickActions } from '@/components/admin/quick-actions';
import { MobilityPulse } from '@/components/admin/mobility-pulse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, TrendingUp, TrendingDown, Users, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdminDashboard(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q?.toLowerCase() || '';
  
  await requireRole('admin');

  const supabase = await createServerSupabaseClient();

  // Fetch requests that require admin attention
  const { data: requests } = await supabase
    .from('pass_requests')
    .select('*, student:profiles(*), approvals(*)')
    .in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved'])
    .order('created_at', { ascending: false });

  // Get counts
  const [activePasses, overdueCount, fraudFlagsCount, todayStats] = await Promise.all([
    supabase
      .from('passes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'used_exit']),
    supabase.rpc('count_overdue'),
    supabase
      .from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false),
    supabase.rpc('get_today_stats'),
  ]);

  // Get today's activity for charts
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const { data: weekActivity } = await supabase
    .from('pass_requests')
    .select('created_at, status')
    .gte('created_at', last7Days.toISOString());

  // Get live mobility pulse (recent scans)
  const { data: recentScans } = await supabase
    .from('pass_scans')
    .select(`
      *,
      pass:passes(
        id,
        student:profiles(full_name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  const pendingRequests = (requests || []).filter(req => {
    if (!q) return true;
    return (
      req.student?.full_name?.toLowerCase().includes(q) ||
      req.request_type?.toLowerCase().includes(q) ||
      req.destination?.toLowerCase().includes(q)
    );
  });

  const stats = {
    pendingRequests: pendingRequests.length,
    activePasses: activePasses.count || 0,
    overdue: overdueCount.data || 0,
    fraudFlags: fraudFlagsCount.count || 0,
    todayApproved: todayStats.data?.today_approved || 0,
    todayRejected: todayStats.data?.today_rejected || 0,
    todayTotal: todayStats.data?.today_total || 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <RealtimeRefresh tables={['pass_requests', 'passes', 'pass_scans', 'student_states', 'fraud_flags', 'escalation_logs']} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Review"
          value={stats.pendingRequests}
          icon={Clock}
          color="blue"
          href="/admin/requests"
          trend={null}
        />
        <StatCard
          title="Active Passes"
          value={stats.activePasses}
          icon={ShieldCheck}
          color="green"
          trend={null}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          color="orange"
          trend={stats.overdue > 0 ? 'up' : null}
        />
        <StatCard
          title="Fraud Flags"
          value={stats.fraudFlags}
          icon={Users}
          color="red"
          href="/admin/fraud"
          trend={null}
        />
      </div>

      {/* Today's Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Today&apos;s Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-success">{stats.todayApproved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.todayRejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.todayTotal}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <ActivityCharts activityData={weekActivity || []} />
        <MobilityPulse scans={(recentScans as any) || []} />
      </div>

      {/* Action Center */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Pending Approvals
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-xs">
                {pendingRequests.length}
              </span>
            )}
          </h2>
          <div className="flex gap-2 items-center">
            <SearchInput placeholder="Search requests..." />
            <Link href="/admin/requests">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-16 bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm">
            <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no pending requests to review.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {pendingRequests.slice(0, 6).map((req) => (
              <ApprovalPanel key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'red';
  href?: string;
  trend?: 'up' | 'down' | null;
}) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  const content = (
    <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-border group hover:border-border/80 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className={`text-4xl font-black tracking-tighter ${
          color === 'red' && value > 0 ? 'text-red-500' :
          color === 'orange' && value > 0 ? 'text-orange-500' :
          'text-foreground'
        }`}>
          {value}
        </p>
        {trend && (
          <span className={`mb-1 ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
