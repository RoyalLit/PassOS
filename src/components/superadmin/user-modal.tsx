'use client';

import { useState, useEffect } from 'react';
import { 
  X, ChevronDown, ShieldCheck, Check, Copy, Loader2, UserCog, UserPlus, Mail, Phone, Building, GraduationCap, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, UserRole, Tenant } from '@/types';
import { clsx } from 'clsx';

interface UserModalProps {
  user?: Profile; // If present, we are in EDIT mode
  targetTenantId?: string; // If present, pre-select this tenant
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function SuperadminUserModal({ user, targetTenantId, isOpen, onClose, onUpdate }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [copied, setCopied] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; temporary_password: string } | null>(null);

  const isEdit = !!user;

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: (user?.role || 'student') as UserRole,
    tenant_id: user?.tenant_id || targetTenantId || '',
    enrollment_number: user?.enrollment_number || '',
    phone: user?.phone || '',
    hostel: user?.hostel || '',
    room_number: user?.room_number || '',
    new_password: '',
  });

  useEffect(() => {
    if (isOpen && (!targetTenantId || isEdit)) {
      loadTenants();
    }
  }, [isOpen, isEdit, targetTenantId]);

  async function loadTenants() {
    setLoadingTenants(true);
    try {
      const res = await fetch('/api/superadmin/tenants');
      const data = await res.json();
      if (res.ok) setTenants(data.tenants || []);
    } catch (e) {
      console.error('Failed to load tenants:', e);
    } finally {
      setLoadingTenants(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/superadmin/users/${user.id}` : '/api/superadmin/users';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process request');

      if (!isEdit) {
        setCredentials(data.credentials);
        toast.success('User created successfully');
      } else {
        toast.success('Profile updated successfully');
        onUpdate?.();
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !confirm('Are you absolutely sure? This will delete the user account and all associated data permanently.')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      toast.success('User deleted successfully');
      onUpdate?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          {isEdit ? <UserCog className="w-5 h-5 text-purple-500" /> : <UserPlus className="w-5 h-5 text-purple-500" />}
          {isEdit ? 'Edit User Profile' : 'Add New User'}
        </h2>

        {credentials ? (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
              <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-bold text-green-600 dark:text-green-400">User Created Successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">Copy these credentials now. They will not be shown again.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Email</label>
                  <code className="text-sm font-mono text-foreground">{credentials.email}</code>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Temporary Password</label>
                  <code className="text-sm font-mono text-foreground break-all">{credentials.temporary_password}</code>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.temporary_password}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast.success('Credentials copied!');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
              </button>

              <button onClick={() => { onUpdate?.(); onClose(); }} className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
                Close & Refresh List
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {(!targetTenantId || isEdit) && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  {isEdit ? 'Change University' : 'Target University'}
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.tenant_id}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    className="w-full appearance-none px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Select University...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {loadingTenants ? <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" /> : <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-muted-foreground" />
                  Role
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full appearance-none px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="student">Student</option>
                    <option value="warden">Warden / Hostel Manager</option>
                    <option value="guard">Security Guard</option>
                    <option value="parent">Parent</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={isEdit}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@university.edu"
                  className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91..."
                  className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  Enrollment / ID
                </label>
                <input
                  type="text"
                  value={form.enrollment_number}
                  onChange={(e) => setForm({ ...form, enrollment_number: e.target.value })}
                  placeholder="ID Number"
                  className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {form.role === 'student' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-2xl border border-border animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Hostel Block</label>
                  <input
                    type="text"
                    value={form.hostel}
                    onChange={(e) => setForm({ ...form, hostel: e.target.value })}
                    placeholder="e.g. Block A"
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Room Number</label>
                  <input
                    type="text"
                    value={form.room_number}
                    onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                    placeholder="e.g. 101"
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
            )}

            {isEdit && (
              <div className="pt-4 border-t border-border mt-4">
                 <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Reset Password (Internal Only)
                </label>
                <input
                  type="password"
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                  placeholder="New password (leave blank to keep current)"
                  className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1 px-1">Superadmins can forcefully reset any user's password here.</p>
              </div>
            )}

            <div className="flex gap-3 pt-6">
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="p-2.5 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50"
                  title="Delete User"
                >
                  <Building className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
