'use client';

import { useState } from 'react';
import { 
  X, ChevronDown, ShieldCheck, Check, Copy, Loader2, UserCog 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Profile, UserRole } from '@/types';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

interface EditUserModalProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  disableRoleChange?: boolean;
}

export function EditUserModal({ user, isOpen, onClose, onUpdate, disableRoleChange }: EditUserModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    role: user.role,
    full_name: user.full_name,
    phone: user.phone || '',
    hostel: user.hostel || '',
    room_number: user.room_number || '',
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editForm.role,
          full_name: editForm.full_name,
          phone: editForm.phone,
          hostel: editForm.role === 'student' ? editForm.hostel : null,
          room_number: editForm.role === 'student' ? editForm.room_number : null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onUpdate?.();
      onClose();
      router.refresh();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          new_password: true // Trigger secure generation
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setResetPasswordResult(data.temporary_password);
      toast.success('New password generated');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to reset password');
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-blue-500" />
          Edit Profile
        </h2>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Role {disableRoleChange && <span className="text-[10px] text-muted-foreground font-normal ml-2">(Locked)</span>}
            </label>
            <div className="relative">
              <select
                disabled={disableRoleChange}
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="w-full appearance-none px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-muted disabled:cursor-not-allowed"
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
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Room</label>
                <input
                  type="text"
                  value={editForm.room_number}
                  onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                  placeholder="101"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border mt-6">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Security & Access
            </h3>
            
            {resetPasswordResult ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  New Temporary Password Generated:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-background border border-amber-500/30 rounded-lg text-sm font-mono break-all text-foreground">
                    {resetPasswordResult}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPasswordResult);
                      setCopied(true);
                      toast.success('Password copied to clipboard');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 bg-background border border-amber-500/30 rounded-lg hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Copy this now. It will not be shown again once you close this modal.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={updating}
                onClick={() => {
                  if (confirm('Are you sure you want to reset this user\'s password? This action cannot be undone.')) {
                    handleResetPassword();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/10 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                Reset User Password
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
  );
}
