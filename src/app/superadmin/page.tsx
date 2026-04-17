'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, AlertTriangle, TrendingUp, Clock, Loader2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  role: string;
  tenant_id: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  old_data: any;
  new_data: any;
  actor: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function SuperadminDashboard() {
  const [data, setData] = useState<{
    tenants: Partial<Tenant>[];
    profiles: ProfileSummary[];
    recentTenants: Tenant[];
    recentActivity: AuditLog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/superadmin/dashboard');
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch dashboard data');
        }
        
        setData(json);
      } catch (e: any) {
        console.error('Failed to load dashboard:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Loading platform data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of all universities and users on PassOS
          </p>
        </div>
        
        <div className="p-8 bg-card/60 backdrop-blur-md border border-red-500/20 rounded-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Data Load Error</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {error || 'An unexpected error occurred while loading the dashboard. Please check your system configuration.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { tenants, profiles, recentTenants, recentActivity } = data!;
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
  const totalUsers = profiles.length;
  const totalAdmins = profiles.filter(p => p.role === 'admin').length;

  const statCards = [
    {
      label: 'Total Universities',
      value: totalTenants,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'hover:border-blue-500/30',
      detail: `${activeTenants} active · ${trialTenants} trial`,
    },
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'hover:border-green-500/30',
      detail: `${totalAdmins} admins across all tenants`,
    },
    {
      label: 'Active Trials',
      value: trialTenants,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'hover:border-orange-500/30',
      detail: 'Universities in onboarding',
    },
    {
      label: 'Suspended',
      value: suspendedTenants,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'hover:border-red-500/30',
      detail: 'Accounts on hold',
    },
  ];

  const formatActivityText = (log: AuditLog) => {
    switch (log.action) {
      case 'create_tenant':
        return `Registered new university: ${log.new_data?.name || 'Unknown'}`;
      case 'update_tenant':
        return `Updated university settings for ${log.new_data?.name || 'a university'}`;
      case 'create_user':
        return `Added new ${log.new_data?.role || 'user'}`;
      case 'update_user':
        const migrated = log.old_data?.tenant_id !== log.new_data?.tenant_id;
        return migrated 
          ? `Migrated user ${log.new_data?.full_name} to another university`
          : `Updated details for ${log.new_data?.full_name}`;
      case 'delete_user':
        return `Deleted user account: ${log.old_data?.full_name}`;
      default:
        return `${log.action.replace('_', ' ')} on ${log.entity_type}`;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of all universities and users on PassOS
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-card/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-border group hover:shadow-md transition-all ${card.bgColor}`}
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                  {card.label}
                </p>
                <Icon size={18} className={card.color} />
              </div>
              <p className="text-4xl font-black tracking-tighter text-foreground">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{card.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 size={18} />
            Recent Universities
          </h2>
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm overflow-hidden">
            {(!recentTenants || recentTenants.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                <p>No universities yet. Create the first one!</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                      University
                    </th>
                    <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                      Plan
                    </th>
                    <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground text-sm">{tenant.name}</span>
                        <p className="text-[10px] text-muted-foreground font-mono">/{tenant.slug}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-border bg-muted/50 text-foreground uppercase">
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={tenant.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-end">
            <Link
              href="/superadmin/tenants"
              className="text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
            >
              View all universities →
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock size={18} />
            Recent Activity
          </h2>
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm p-4 space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-xs">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm animate-in slide-in-from-right-2 duration-300">
                    <div className="mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-border ${
                        log.action.includes('create') ? 'bg-green-500/10 text-green-500' :
                        log.action.includes('delete') ? 'bg-red-500/10 text-red-500' : 
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium leading-tight">
                        {formatActivityText(log)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {log.actor?.full_name || 'System'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">•</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at))} ago
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 bg-muted/20 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground">
              This feed shows the 10 most recent administrative actions across all tenants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { formatDistanceToNow } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 dark:text-green-400',
    trial: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    suspended: 'bg-red-500/10 text-red-600 dark:text-red-400',
    inactive: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${styles[status] || styles.inactive}`}>
      {status}
    </span>
  );
}
