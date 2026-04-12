'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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

export default function SuperadminDashboard() {
  const [data, setData] = useState<{
    tenants: Partial<Tenant>[];
    profiles: ProfileSummary[];
    recentTenants: Tenant[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('tenants').select('id, status, plan'),
      supabase.from('profiles').select('id, role, tenant_id'),
      supabase.from('tenants').select('id, name, slug, status, plan, created_at').order('created_at', { ascending: false }).limit(5),
    ]).then(([tenants, profiles, recentTenants]) => {
      setData({ tenants: tenants.data || [], profiles: profiles.data || [], recentTenants: recentTenants.data || [] });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const { tenants, profiles, recentTenants } = data!;
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

      <div>
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock size={18} />
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
                    Slug
                  </th>
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                    Plan
                  </th>
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{tenant.name}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm font-mono">
                      {tenant.slug}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-foreground capitalize">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href="/superadmin/tenants"
            className="text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
          >
            View all universities →
          </Link>
        </div>
      </div>
    </div>
  );
}

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
