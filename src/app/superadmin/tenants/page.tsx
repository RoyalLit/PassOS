'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Building2, Plus, Search, MoreHorizontal, Trash2, Edit2, Eye } from 'lucide-react';
import type { Tenant, TenantStatus, TenantPlan } from '@/types';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    
    setTenants(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = tenants.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.domains.some((d) => d.toLowerCase().includes(search.toLowerCase()))
  );

  const statusCounts = {
    active: tenants.filter((t) => t.status === 'active').length,
    trial: tenants.filter((t) => t.status === 'trial').length,
    suspended: tenants.filter((t) => t.status === 'suspended').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Universities
          </h1>
          <p className="text-muted-foreground">
            Manage all universities on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={16} />
          Add University
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', count: statusCounts.active, color: 'text-green-500', border: 'hover:border-green-500/30' },
          { label: 'Trial', count: statusCounts.trial, color: 'text-orange-500', border: 'hover:border-orange-500/30' },
          { label: 'Suspended', count: statusCounts.suspended, color: 'text-red-500', border: 'hover:border-red-500/30' },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-card/60 backdrop-blur-md p-4 rounded-xl border border-border transition-all ${s.border}`}
          >
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{s.label}</p>
            <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, slug, or domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card/60 backdrop-blur-md border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/4 mx-auto" />
              <div className="h-4 bg-muted rounded w-1/6 mx-auto" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No universities found</p>
            {search && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                  University
                </th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                  Domains
                </th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                  Plan
                </th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">
                  Created
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">/{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tenant.domains.slice(0, 3).map((d) => (
                        <span key={d} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
                          {d}
                        </span>
                      ))}
                      {tenant.domains.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{tenant.domains.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <PlanBadge plan={tenant.plan} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/superadmin/tenants/${tenant.id}`}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="View details"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={() => setEditing(tenant)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      {tenant.slug !== '__system__' && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete ${tenant.name}?`)) return;
                            const res = await fetch(`/api/tenants/${tenant.id}`, { method: 'DELETE' });
                            if (res.ok) loadData();
                            else {
                              const { error } = await res.json();
                              alert(error || 'Delete failed');
                            }
                          }}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showCreate || editing) && (
        <TenantModal
          tenant={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { setShowCreate(false); setEditing(null); loadData(); }}
        />
      )}
    </div>
  );
}

function TenantModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tenant?.name || '');
  const [slug, setSlug] = useState(tenant?.slug || '');
  const [domains, setDomains] = useState(tenant?.domains.join(', ') || '');
  const [plan, setPlan] = useState<TenantPlan>(tenant?.plan || 'starter');
  const [status, setStatus] = useState<TenantStatus>(tenant?.status || 'trial');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!tenant;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      domains: domains.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
      plan,
      ...(isEditing ? { status } : {}),
    };

    const url = isEditing ? `/api/tenants/${tenant.id}` : '/api/tenants';
    const method = isEditing ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {isEditing ? 'Edit University' : 'Add University'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditing ? 'Update university details' : 'Create a new university on the platform'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              University Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Stanford University"
              required
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="stanford"
              required
              pattern="[a-z0-9-]+"
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">Lowercase, letters, numbers, hyphens only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email Domains
            </label>
            <input
              type="text"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              placeholder="stanford.edu, student.stanford.edu"
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated. New users with these domains are auto-assigned here.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as TenantPlan)}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {['free', 'starter', 'pro', 'enterprise'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TenantStatus)}
                  className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {['active', 'trial', 'suspended', 'inactive'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create University'}
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
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${styles[status] || styles.inactive}`}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    starter: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    pro: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    enterprise: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  );
}
