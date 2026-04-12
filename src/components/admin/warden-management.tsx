'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, User, Users, Plus, Trash2, X, CheckCircle2, Loader2, UserCog
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import type { Warden, Profile } from '@/types';
import { EditUserModal } from './edit-user-modal';

interface WardenManagementProps {
  allWardens: {
    profile: Profile;
    assignedHostels: string[];
  }[];
  availableUsers: (Profile & { role: string })[];
  hostels: string[];
  wardensByHostel: Record<string, unknown[]>;
}

export function WardenManagement({
  allWardens,
  availableUsers,
  hostels,
  wardensByHostel,
}: WardenManagementProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedHostels, setSelectedHostels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const handleAddHostel = (hostel: string) => {
    setSelectedHostels(prev => 
      prev.includes(hostel) 
        ? prev.filter(h => h !== hostel)
        : [...prev, hostel]
    );
  };

  const handleAssign = async () => {
    if (!selectedUser || selectedHostels.length === 0) {
      toast.error('Please select a user and at least one hostel');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First, ensure the user has 'warden' role
      await supabase
        .from('profiles')
        .update({ role: 'warden' })
        .eq('id', selectedUser);

      // Add warden assignments for each hostel
      for (const hostel of selectedHostels) {
        const { error } = await supabase
          .from('wardens')
          .insert({
            profile_id: selectedUser,
            hostel,
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      }

      toast.success('Warden assigned successfully');
      setIsAdding(false);
      setSelectedUser('');
      setSelectedHostels([]);
      router.refresh();
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to assign warden');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (wardenId: string, hostel: string) => {
    setDeletingId(wardenId);
    try {
      const { error } = await supabase
        .from('wardens')
        .delete()
        .eq('profile_id', wardenId)
        .eq('hostel', hostel);

      if (error) throw error;

      toast.success('Warden assignment removed');
      router.refresh();
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove warden');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Warden Directory</h2>
            <p className="text-sm text-muted-foreground">
              {allWardens.length} warden{allWardens.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Assign Warden
          </button>
        ) : (
          <button
            onClick={() => {
              setIsAdding(false);
              setSelectedUser('');
              setSelectedHostels([]);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-all"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>

      {/* Add Warden Form */}
      {isAdding && (
        <div className="p-6 bg-blue-500/5 border-b border-blue-500/20">
          <h3 className="font-bold text-foreground mb-4">Assign New Warden</h3>
          
          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No available users. All admins/guards are already wardens.
                </p>
              )}
            </div>

            {/* Hostel Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Hostels (one or more)
              </label>
              <div className="flex flex-wrap gap-2">
                {hostels.map(hostel => (
                  <button
                    key={hostel}
                    onClick={() => handleAddHostel(hostel)}
                    className={clsx(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                      selectedHostels.includes(hostel)
                        ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-card border-border text-muted-foreground hover:border-blue-500/50 hover:text-foreground'
                    )}
                  >
                    {hostel}
                  </button>
                ))}
                {hostels.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hostels available. Add students with hostel assignments first.
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                onClick={handleAssign}
                disabled={loading || !selectedUser || selectedHostels.length === 0}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Assign to {selectedHostels.length} hostel{selectedHostels.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warden List */}
      <div className="divide-y divide-border">
        {allWardens.length > 0 ? (
          allWardens.map(({ profile, assignedHostels }) => (
            <div 
              key={profile.id}
              className="p-4 hover:bg-muted/5 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="" 
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      {profile.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {assignedHostels.map(hostel => (
                    <span 
                      key={hostel}
                      className="group flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20 shadow-sm"
                    >
                      <Building2 className="w-3 h-3" />
                      {hostel}
                      <button
                        onClick={() => handleRemove(profile.id, hostel)}
                        className="p-1 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                        title="Remove assignment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(profile)}
                        className="p-2 text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                        title="Edit Profile"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                    </div>
                  
                  {assignedHostels.length === 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                      <X className="w-3 h-3" />
                      UNASSIGNED
                    </span>
                  )}

                  <button
                    onClick={() => {
                      setSelectedUser(profile.id);
                      setIsAdding(true);
                      setSelectedHostels(assignedHostels);
                    }}
                    className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {assignedHostels.length > 0 ? 'Add Hostel' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-foreground mb-2">No wardens found</h3>
            <p className="text-muted-foreground mb-4">
              Create a warden user first in the Users section
            </p>
          </div>
        )}
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
