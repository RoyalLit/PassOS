import { requireWarden } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Building2, Users, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default async function WardenAnalyticsPage() {
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();
  
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  // Get all students in hostels
  const { data: hostelStudents } = await supabase
    .from('profiles')
    .select('id, hostel')
    .eq('role', 'student')
    .in('hostel', hostels);
  
  const studentIds = hostelStudents?.map(s => s.id) || [];
  
  // Get student states
  const { data: studentStates } = studentIds.length > 0
    ? await supabase
        .from('student_states')
        .select('*')
        .in('student_id', studentIds)
    : { data: [] };
  
  const insideCount = studentStates?.filter(s => s.current_state === 'inside').length || 0;
  const outsideCount = studentStates?.filter(s => s.current_state === 'outside').length || 0;
  const overdueCount = studentStates?.filter(s => s.current_state === 'overdue').length || 0;
  
  // Get passes data for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'EEE'),
      fullDate: format(date, 'yyyy-MM-dd'),
    };
  });
  
  const passesPerDay = await Promise.all(
    last7Days.map(async ({ date, fullDate }) => {
      const { count } = studentIds.length > 0
        ? await supabase
            .from('passes')
            .select('id', { count: 'exact', head: true })
            .in('student_id', studentIds)
            .gte('created_at', `${fullDate}T00:00:00`)
            .lt('created_at', `${fullDate}T23:59:59`)
        : { count: 0 };
      
      return { date, passes: count || 0 };
    })
  );
  
  // Get requests by status
  const { data: allRequests } = studentIds.length > 0
    ? await supabase
        .from('pass_requests')
        .select('status')
        .in('student_id', studentIds)
        .gte('created_at', `${format(subDays(new Date(), 30), 'yyyy-MM-dd')}T00:00:00`)
    : { data: [] };
  
  const statusCounts = (allRequests || []).reduce((acc: Record<string, number>, req: { status: string }) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = [
    { name: 'Inside', value: insideCount, color: '#22c55e' },
    { name: 'Outside', value: outsideCount, color: '#3b82f6' },
    { name: 'Overdue', value: overdueCount, color: '#ef4444' },
  ].filter(d => d.value > 0);
  
  const statusPieData = [
    { name: 'Approved', value: statusCounts['approved'] || 0, color: '#22c55e' },
    { name: 'Pending', value: (statusCounts['pending'] || 0) + (statusCounts['parent_pending'] || 0) + (statusCounts['admin_pending'] || 0), color: '#f59e0b' },
    { name: 'Rejected', value: statusCounts['rejected'] || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hostel Analytics
          </h1>
          <p className="text-muted-foreground">
            Performance overview for the last 7 days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hostels.map(hostel => (
            <span 
              key={hostel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium"
            >
              <Building2 className="w-4 h-4" />
              {hostel}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{studentIds.length}</p>
          <p className="text-sm text-muted-foreground">Total Students</p>
        </div>
        
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{insideCount}</p>
          <p className="text-sm text-muted-foreground">Currently Inside</p>
        </div>
        
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{outsideCount}</p>
          <p className="text-sm text-muted-foreground">Currently Outside</p>
        </div>
        
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{overdueCount}</p>
          <p className="text-sm text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Passes Per Day */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Passes Issued</h2>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={passesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem'
                  }}
                />
                <Bar dataKey="passes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Status Distribution */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Student Distribution</h2>
              <p className="text-sm text-muted-foreground">Current status</p>
            </div>
          </div>
          
          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-muted-foreground">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Request Status */}
        <div className="bg-card rounded-2xl border shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Request Summary</h2>
              <p className="text-sm text-muted-foreground">Last 30 days by status</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4">
            {statusPieData.map((item) => (
              <div 
                key={item.name}
                className="p-4 rounded-xl border border-border bg-muted/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {allRequests && allRequests.length > 0 
                    ? `${((item.value / allRequests.length) * 100).toFixed(1)}% of total`
                    : 'No requests'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
