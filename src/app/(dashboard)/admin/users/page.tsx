'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlus, Users, GraduationCap, User, ShieldCheck, 
  X, Loader2, Search, Trash2, Copy, Check, ChevronDown,
  Mail, Phone, Building, Bed, UserCog, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import type { UserRole } from '@/types';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  hostel?: string;
  room_number?: string;
  avatar_url?: string;
  role: UserRole;
  parent_id?: string;
  created_at: string;
}

interface NewUserForm {
  full_name: string;
  email: string;
  role: 'student' | 'parent' | 'guard' | 'warden';
  phone: string;
  hostel: string;
  room_number: string;
  parent_email: string;
}

interface CreatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  credentials: {
    email: string;
    temporary_password: string;
  };
}

const ROLE_CONFIG = {
  student: { label: 'Students', icon: GraduationCap, color: 'blue' },
  parent: { label: 'Parents', icon: User, color: 'purple' },
  guard: { label: 'Security', icon: ShieldCheck, color: 'emerald' },
  warden: { label: 'Wardens', icon: Bed, color: 'cyan' },
  admin: { label: 'Admins', icon: Users, color: 'amber' },
  superadmin: { label: 'Superadmins', icon: ShieldCheck, color: 'red' },
} as const;

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState<NewUserForm>({
    full_name: '',
    email: '',
    role: 'student',
    phone: '',
    hostel: '',
    room_number: '',
    parent_email: '',
  });

  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetchUsers().then(() => {
      const action = searchParams.get('action');
      const editId = searchParams.get('edit');

      if (action === 'add') {
        setShowCreateModal(true);
        // Clear params
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (editId) {
        // Need to find the user in the already fetched list
        // Wait for users to be fetched if they haven't been
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update effect to handle editId once users are loaded
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && users.length > 0) {
      const userToEdit = users.find(u => u.id === editId);
      if (userToEdit) {
        openEditModal(userToEdit);
        // Clear params to avoid loop/re-open
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, users.length]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = filterRole !== 'all' ? `?role=${filterRole}` : '';
      const res = await fetch(`/api/admin/users${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(json.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      setCreatedUser(json);
      toast.success('User created successfully');
      setForm({
        full_name: '',
        email: '',
        role: 'student',
        phone: '',
        hostel: '',
        room_number: '',
        parent_email: '',
      });
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Email: ${createdUser.credentials.email}\nPassword: ${createdUser.credentials.temporary_password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const openEditModal = (user: Profile) => {
    setEditingUser(user);
    setEditForm({
      id: user.id,
      full_name: user.full_name,
      phone: user.phone || '',
      hostel: user.hostel || '',
      room_number: user.room_number || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingUser) return;

    // Check if role changed and confirm if not already confirmed
    if (editForm.role !== editingUser.role && !showRoleConfirm) {
      setShowRoleConfirm(true);
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: editingUser.id, 
          ...editForm 
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }

      toast.success('User updated successfully');
      setShowEditModal(false);
      setShowRoleConfirm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.hostel?.toLowerCase().includes(query)) ||
      (user.room_number?.toLowerCase().includes(query))
    );
  });

  const userCounts = {
    student: users.filter(u => u.role === 'student').length,
    parent: users.filter(u => u.role === 'parent').length,
    guard: users.filter(u => u.role === 'guard').length,
    warden: users.filter(u => u.role === 'warden').length,
    admin: users.filter(u => u.role === 'admin').length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground">Add and manage students, parents, and security personnel</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(ROLE_CONFIG)
          .filter(([key]) => key !== 'superadmin')
          .map(([key, config]) => {
            const Icon = config.icon;
          const count = userCounts[key as UserRole] || 0;
          const isActive = filterRole === key;
          return (
            <button
              key={key}
              onClick={() => setFilterRole(filterRole === key ? 'all' : key as UserRole)}
              className={clsx(
                'p-4 rounded-2xl border transition-all text-left',
                isActive
                  ? 'bg-blue-500/10 border-blue-500/30 shadow-sm'
                  : 'bg-card border-border hover:border-blue-500/30'
              )}
            >
              <Icon className={clsx(
                'w-5 h-5 mb-2',
                isActive ? 'text-blue-500' : 'text-muted-foreground'
              )} />
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs font-medium text-muted-foreground">{config.label}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, hostel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/10 border-b border-border text-sm text-muted-foreground">
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const RoleIcon = (ROLE_CONFIG as any)[user.role]?.icon || User;
                  return (
                    <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold border border-blue-500/20 overflow-hidden">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase',
                          user.role === 'student' && 'bg-blue-500/10 text-blue-600',
                          user.role === 'parent' && 'bg-purple-500/10 text-purple-600',
                          user.role === 'guard' && 'bg-emerald-500/10 text-emerald-600',
                          user.role === 'warden' && 'bg-violet-500/10 text-violet-600',
                          user.role === 'admin' && 'bg-amber-500/10 text-amber-600',
                        )}>
                          <RoleIcon className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {user.phone && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </p>
                          )}
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.hostel || user.room_number ? (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {[user.hostel, user.room_number && `Room ${user.room_number}`].filter(Boolean).join(' - ')}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit Profile"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => {
            setShowCreateModal(false);
            setCreatedUser(null);
          }} />
          
          <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setCreatedUser(null);
              }}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {createdUser ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">User Created!</h2>
                <p className="text-muted-foreground mb-6">Share these credentials with the user. They should change their password after first login.</p>
                
                <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3 mb-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                    <p className="font-mono text-sm">{createdUser.credentials.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Temporary Password</p>
                    <p className="font-mono text-sm break-all">{createdUser.credentials.temporary_password}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyCredentials}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Credentials'}
                  </button>
                  <button
                    onClick={() => setCreatedUser(null)}
                    className="px-4 py-3 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-all"
                  >
                    Add Another
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-6">Add New User</h2>
                
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                    <div className="relative">
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as NewUserForm['role'] })}
                        className="w-full appearance-none px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="student">Student</option>
                        <option value="parent">Parent</option>
                        <option value="guard">Security Guard</option>
                        <option value="warden">Warden</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john.doe@example.com"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Phone (Optional)</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {form.role === 'student' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Hostel</label>
                          <input
                            type="text"
                            value={form.hostel}
                            onChange={(e) => setForm({ ...form, hostel: e.target.value })}
                            placeholder="Block A"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Room</label>
                          <input
                            type="text"
                            value={form.room_number}
                            onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                            placeholder="101"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-foreground mb-1">Parent Email (Optional)</label>
                          <input
                            type="email"
                            value={form.parent_email}
                            onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                            placeholder="parent@example.com"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Link to an existing parent account</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreatedUser(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create User
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          
          <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-foreground mb-6">Edit Profile</h2>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <div className="relative">
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full appearance-none px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="guard">Security Guard</option>
                    <option value="warden">Warden</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {editForm.role === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Hostel</label>
                    <input
                      type="text"
                      value={editForm.hostel}
                      onChange={(e) => setEditForm({ ...editForm, hostel: e.target.value })}
                      placeholder="Block A"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Room</label>
                    <input
                      type="text"
                      value={editForm.room_number}
                      onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                      placeholder="101"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRoleConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-md" onClick={() => setShowRoleConfirm(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-destructive/20 p-6 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Changing Role?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You are about to change this user&apos;s role from <span className="font-bold text-foreground uppercase">{editingUser?.role}</span> to <span className="font-bold text-primary uppercase">{editForm.role}</span>. This affects their system permissions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRoleConfirm(false)}
                className="flex-1 px-4 py-3 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-all text-foreground"
              >
                Go Back
              </button>
              <button
                onClick={() => handleUpdateUser()}
                className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-xl font-bold text-sm hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20"
              >
                Yes, Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
