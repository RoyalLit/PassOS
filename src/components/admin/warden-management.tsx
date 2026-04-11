'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, User, Plus, Trash2, X, CheckCircle2, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import type { Warden, Profile } from '@/types';

interface WardenManagementProps {
  wardens: (Warden & { profile?: Profile })[];
  availableUsers: (Profile & { role: string })[];
  hostels: string[];
  wardensByHostel: Record<string, (Warden & { profile?: Profile })[]>;
}

export function WardenManagement({
  wardens: initialWardens,
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
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Assigned Wardens</h2>
            <p className="text-sm text-muted-foreground">
              {initialWardens.length} warden assignment{initialWardens.length !== 1 ? 's' : ''}
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
        {initialWardens.length > 0 ? (
          initialWardens.map(warden => (
            <div 
              key={`${warden.id}-${warden.hostel}`}
              className="p-4 hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    {warden.profile?.avatar_url ? (
                      <img 
                        src={warden.profile.avatar_url} 
                        alt="" 
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-purple-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      {warden.profile?.full_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {warden.profile?.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium">
                    <Building2 className="w-4 h-4" />
                    {warden.hostel}
                  </span>
                  
                  <button
                    onClick={() => handleRemove(warden.profile_id, warden.hostel)}
                    disabled={deletingId === warden.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === warden.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-foreground mb-2">No wardens assigned</h3>
            <p className="text-muted-foreground mb-4">
              Assign wardens to manage specific hostels
            </p>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Assign Warden
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
