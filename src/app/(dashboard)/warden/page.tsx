import { requireWarden } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { 
  Users, Clock, AlertTriangle, CheckCircle2, 
  Building2, ArrowRight, ClipboardList
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import type { WardenPendingRequest } from '@/types';

export default async function WardenDashboardPage() {
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();

  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  // Get hostel-specific stats (if any assigned, otherwise all students in tenant)
  let studentQuery = supabase
    .from('profiles')
    .select('id, hostel')
    .eq('role', 'student')
    .eq('tenant_id', profile.tenant_id);
  
  if (hostels.length > 0) {
    studentQuery = studentQuery.in('hostel', hostels);
  }

  const { data: hostelStudents, error: studentError } = await studentQuery;
  if (studentError) {
    console.error('Diagnostic: Warden student query failed:', studentError);
  }

  const studentIds = hostelStudents?.map(s => s.id) || [];
  console.log('Diagnostic: Warden Context:', {
    tenantId: profile.tenant_id,
    hostels: hostels,
    studentCount: studentIds.length
  });
  
  // Get student states for hostel students
  const { data: studentStates } = studentIds.length > 0
    ? await supabase
        .from('student_states')
        .select('*')
        .in('student_id', studentIds)
    : { data: [] };
  
  const insideCount = studentStates?.filter(s => s.current_state === 'inside').length || 0;
  const outsideCount = studentStates?.filter(s => s.current_state === 'outside').length || 0;
  const overdueCount = studentStates?.filter(s => s.current_state === 'overdue').length || 0;
  
  // Get pending requests for hostel students
  const { data: pendingRequests } = studentIds.length > 0
    ? await supabase
        .from('pass_requests')
        .select('*, student:profiles(*)')
        .in('student_id', studentIds)
        .in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved'])
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] };
  
  // Get today's passes issued count
  const today = new Date().toISOString().split('T')[0];
  let passesQuery = supabase
    .from('passes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id)
    .gte('created_at', today);
  
  if (studentIds.length > 0 && hostels.length > 0) {
    passesQuery = passesQuery.in('student_id', studentIds);
  } else if (hostels.length > 0) {
    // If we have hostels but no students (unlikely but safe)
    passesQuery = passesQuery.in('student_id', []);
  }

  const { count: todayPasses } = await passesQuery;

  const stats = [
    {
      label: 'Total Students',
      value: studentIds.length,
      icon: Users,
      color: 'blue',
      href: '/warden/students'
    },
    {
      label: 'Inside Campus',
      value: insideCount,
      icon: CheckCircle2,
      color: 'green',
      href: '/warden/students?filter=inside'
    },
    {
      label: 'Outside Campus',
      value: outsideCount,
      icon: Clock,
      color: 'orange',
      href: '/warden/students?filter=outside'
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: AlertTriangle,
      color: 'red',
      href: '/warden/students?filter=overdue'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Warden Dashboard
          </h1>
          <p className="text-muted-foreground">
            {hostels.length > 0 
              ? `Managing ${hostels.length > 1 ? `${hostels.length} hostels` : hostels[0]}`
              : 'Managing All Hostels'
            }
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            green: 'bg-green-500/10 text-green-600 dark:text-green-400',
            orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
            red: 'bg-red-500/10 text-red-600 dark:text-red-400',
          };
          
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group bg-card rounded-2xl border shadow-sm p-5 hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  colorClasses[stat.color as keyof typeof colorClasses]
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-4xl font-black text-foreground tracking-tighter mb-1">{stat.value}</p>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ClipboardList className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Pending Approvals</h2>
                <p className="text-sm text-muted-foreground">{pendingRequests?.length || 0} requests awaiting</p>
              </div>
            </div>
            <Link 
              href="/warden/requests"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View All
            </Link>
          </div>
          
          {pendingRequests && pendingRequests.length > 0 ? (
            <div className="divide-y divide-border">
              {(pendingRequests as WardenPendingRequest[]).slice(0, 4).map((request) => (
                <div key={request.id} className="p-4 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground leading-none">{request.student?.full_name}</p>
                      {request.student?.enrollment_number && (
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          {request.student.enrollment_number}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded">
                      {request.student?.hostel}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <p className="text-sm font-black text-muted-foreground leading-none">Reason:</p>
                    <p className="text-sm text-foreground/80 font-medium line-clamp-2 leading-tight">
                      {request.reason}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.departure_at), 'MMM d, h:mm a')}
                    </span>
                    <span className={clsx(
                      "px-2 py-0.5 rounded border-2 text-[10px] font-black uppercase tracking-widest",
                      request.status === 'pending' ? 'bg-muted/50 text-muted-foreground border-border' :
                      request.status === 'parent_pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-violet-500/10 text-violet-500 border-violet-500/20'
                    )}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500/50 mb-3" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          )}
        </div>

        {/* Today's Activity */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Today&apos;s Activity</h2>
                <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {todayPasses || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Passes Issued</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {pendingRequests?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Pending</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Student Distribution</span>
                <span className="font-medium">{studentIds.length} total</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden flex">
                {studentIds.length > 0 && (
                  <>
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${(insideCount / studentIds.length) * 100}%` }}
                    />
                    <div 
                      className="bg-orange-500 h-full" 
                      style={{ width: `${(outsideCount / studentIds.length) * 100}%` }}
                    />
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${(overdueCount / studentIds.length) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Inside ({insideCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Outside ({outsideCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Overdue ({overdueCount})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-card rounded-2xl border shadow-sm p-6">
        <h2 className="font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/warden/requests"
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
          >
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium text-foreground group-hover:text-blue-600">Review Requests</p>
              <p className="text-xs text-muted-foreground">{pendingRequests?.length || 0} pending</p>
            </div>
          </Link>
          <Link
            href="/warden/students"
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-green-500/30 hover:bg-green-500/5 transition-all group"
          >
            <Users className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-foreground group-hover:text-green-600">View Students</p>
              <p className="text-xs text-muted-foreground">{studentIds.length} in hostels</p>
            </div>
          </Link>
          <Link
            href="/warden/parents"
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group"
          >
            <Users className="w-5 h-5 text-purple-500" />
            <div>
              <p className="font-medium text-foreground group-hover:text-purple-600">Parent Contacts</p>
              <p className="text-xs text-muted-foreground">View parent info</p>
            </div>
          </Link>
          <Link
            href="/warden/analytics"
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
          >
            <Building2 className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-medium text-foreground group-hover:text-orange-600">Hostel Analytics</p>
              <p className="text-xs text-muted-foreground">View statistics</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
