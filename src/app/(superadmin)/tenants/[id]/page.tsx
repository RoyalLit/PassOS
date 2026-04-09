'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Users, AlertTriangle, ArrowLeft, Edit2, X } from 'lucide-react';
import type { Tenant, Profile, TenantStatus, TenantPlan } from '@/types';

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: tenant }, { data: users }] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('tenant_id', id).order('created_at', { ascending: false }),
      ]);
      setTenant(tenant);
      setUsers(users || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">University not found</p>
        <a href="/superadmin/tenants" className="text-sm text-purple-600 mt-2 inline-block">← Back to list</a>
      </div>
    );
  }

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/superadmin/tenants" className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <ArrowLeft size={16} />
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{tenant.name}</h1>
          <p className="text-muted-foreground font-mono">/{tenant.slug}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Edit2 size={14} />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-blue-500' },
          { label: 'Admins', value: roleCounts['admin'] || 0, color: 'text-purple-500' },
          { label: 'Students', value: roleCounts['student'] || 0, color: 'text-green-500' },
          { label: 'Guards', value: roleCounts['guard'] || 0, color: 'text-orange-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card/60 backdrop-blur-md p-4 rounded-xl border border-border">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{s.label}</p>
            <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-foreground mb-4">Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd><StatusBadge status={tenant.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Plan</dt>
              <dd><PlanBadge plan={tenant.plan} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm text-foreground">{new Date(tenant.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between items-start">
              <dt className="text-sm text-muted-foreground">Domains</dt>
              <dd className="text-right">
                {tenant.domains.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None</span>
                ) : (
                  tenant.domains.map((d) => (
                    <span key={d} className="inline-block text-xs bg-muted px-2 py-0.5 rounded-full font-mono ml-1 first:ml-0">
                      {d}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-foreground mb-4">Settings</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Geofencing</dt>
              <dd className="text-sm text-foreground">
                {tenant.settings?.geofencing_enabled ? 'Enabled' : 'Disabled'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Parent Approval</dt>
              <dd className="text-sm text-foreground capitalize">
                {tenant.settings?.parent_approval_mode || 'smart'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Campus Radius</dt>
              <dd className="text-sm text-foreground">
                {tenant.settings?.campus_radius_meters || 500}m
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Users size={16} />
            Users ({users.length})
          </h3>
        </div>
        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={32} className="mx-auto mb-2 opacity-20" />
            <p>No users in this university yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">Name</th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">Email</th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">Role</th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">{user.full_name}</td>
                  <td className="px-6 py-3 text-muted-foreground text-sm">{user.email}</td>
                  <td className="px-6 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-6 py-3 text-muted-foreground text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditTenantModal
          tenant={tenant}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { setTenant(updated); setEditing(false); }}
        />
      )}
    </div>
  );
}

function EditTenantModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: (t: Tenant) => void;
}) {
  const [name, setName] = useState(tenant.name);
  const [domains, setDomains] = useState(tenant.domains.join(', '));
  const [plan, setPlan] = useState<TenantPlan>(tenant.plan);
  const [status, setStatus] = useState<TenantStatus>(tenant.status);
  const [brandPrimary, setBrandPrimary] = useState(tenant.brand_primary || '#2563eb');
  const [brandSecondary, setBrandSecondary] = useState(tenant.brand_secondary || '#3b82f6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        domains: domains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean), 
        plan, 
        status,
        brand_primary: brandPrimary,
        brand_secondary: brandSecondary,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }

    onSaved(data.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Edit University</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Domains</label>
            <input value={domains} onChange={e => setDomains(e.target.value)} className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value as TenantPlan)} className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                {['free', 'starter', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TenantStatus)} className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                {['active', 'trial', 'suspended', 'inactive'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="w-10 h-10 border-0 bg-transparent cursor-pointer" />
                <input value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="flex-1 px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Secondary Color</label>
              <div className="flex gap-2">
                <input type="color" value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)} className="w-10 h-10 border-0 bg-transparent cursor-pointer" />
                <input value={brandSecondary} onChange={e => setBrandSecondary(e.target.value)} className="flex-1 px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-mono" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 disabled:opacity-50">
              {saving ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
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
  return <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${styles[status] || ''}`}>{status}</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-600',
    starter: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    pro: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    enterprise: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[plan] || ''}`}>{plan}</span>;
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    student: 'bg-green-500/10 text-green-600 dark:text-green-400',
    parent: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    guard: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    superadmin: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[role] || ''}`}>{role}</span>;
}
