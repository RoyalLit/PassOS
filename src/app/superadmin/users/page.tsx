'use client';

import { Search, Users, ShieldCheck, UserPlus, Edit2 } from 'lucide-react';
import type { Profile, Tenant } from '@/types';
import { SuperadminUserModal } from '@/components/superadmin/user-modal';

interface ProfileWithTenant extends Omit<Profile, 'tenant'> {
  tenant: Pick<Tenant, 'id' | 'name' | 'slug'> | undefined;
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<ProfileWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileWithTenant | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/superadmin/users');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      setUsers((data.profiles as ProfileWithTenant[]) || []);
    } catch (e: any) {
      console.error('Failed to load users:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchTenant =
      tenantFilter === 'all' ||
      u.tenant?.id === tenantFilter;
    return matchSearch && matchRole && matchTenant;
  });

  const roleCounts = users.reduce(
    (acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const uniqueTenants = Array.from(
    new Map(
      users
        .map((u) => ({ id: u.tenant?.id, name: u.tenant?.name }))
        .filter((t): t is { id: string; name: string } => !!t.id)
        .map((t) => [t.id, t])
    ).values()
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            All Users
          </h1>
          <p className="text-muted-foreground">
            View and manage users across all universities
          </p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition-all active:scale-95"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Data Load Error</p>
            <p className="opacity-80">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-blue-500', border: 'hover:border-blue-500/30' },
          { label: 'Students', value: roleCounts['student'] || 0, color: 'text-green-500', border: 'hover:border-green-500/30' },
          { label: 'Admins', value: roleCounts['admin'] || 0, color: 'text-purple-500', border: 'hover:border-purple-500/30' },
          { label: 'Guards', value: roleCounts['guard'] || 0, color: 'text-orange-500', border: 'hover:border-orange-500/30' },
          { label: 'Superadmins', value: roleCounts['superadmin'] || 0, color: 'text-red-500', border: 'hover:border-red-500/30' },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-card/60 backdrop-blur-md p-4 rounded-xl border border-border transition-all ${s.border}`}
          >
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{s.label}</p>
            <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card/60 backdrop-blur-md border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-card/60 backdrop-blur-md border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
          <option value="guard">Guards</option>
          <option value="parent">Parents</option>
          <option value="superadmin">Superadmins</option>
        </select>
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="px-3 py-2.5 bg-card/60 backdrop-blur-md border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <option value="all">All Universities</option>
          {uniqueTenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm">Retrieving users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">User</th>
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">University</th>
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">Role</th>
                  <th className="text-left text-xs font-black uppercase tracking-widest text-muted-foreground/60 px-6 py-3">Joined</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => {
                  return (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground text-sm flex items-center gap-1.5 line-clamp-1">
                            {user.full_name}
                            {user.is_flagged && <span title="Flagged" className="text-red-500">⚑</span>}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border">
                          {user.tenant?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-purple-500 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreateUser || editingUser) && (
        <SuperadminUserModal
          isOpen={true}
          user={editingUser ? (editingUser as unknown as Profile) : undefined}
          onClose={() => { setShowCreateUser(false); setEditingUser(null); }}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    student: 'bg-green-500/10 text-green-600 dark:text-green-400',
    parent: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    guard: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    superadmin: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[role] || ''}`}>
      {role}
    </span>
  );
}
