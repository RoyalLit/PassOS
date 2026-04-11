import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, User, Plus, Trash2, Users, X,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import { WardenManagement } from '@/components/admin/warden-management';
import { clsx } from 'clsx';
import type { Warden, Profile } from '@/types';

export default async function AdminWardensPage() {
  const profile = await requireRole('admin');
  const supabase = await createServerSupabaseClient();
  
  // Get all wardens with their profiles
  const { data: wardens } = await supabase
    .from('wardens')
    .select(`
      *,
      profile:profiles!profile_id(
        id,
        full_name,
        email,
        hostel,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });
  
  // Get all students to extract unique hostels
  const { data: students } = await supabase
    .from('profiles')
    .select('hostel')
    .eq('role', 'student')
    .not('hostel', 'is', null);
  
  const uniqueHostels = [...new Set((students || []).map(s => s.hostel).filter(Boolean))] as string[];
  
  // Group wardens by hostel
  const wardensByHostel = (wardens || []).reduce((acc: Record<string, (Warden & { profile?: Profile })[]>, warden) => {
    if (!acc[warden.hostel]) acc[warden.hostel] = [];
    acc[warden.hostel].push(warden);
    return acc;
  }, {});
  
  // Get all users who could be wardens (admins can elevate users)
  const { data: potentialWardens } = await supabase
    .from('profiles')
    .select('id, full_name, email, hostel, role')
    .in('role', ['admin', 'guard', 'warden'])
    .order('full_name');
  
  const existingWardenIds = (wardens || []).map(w => w.profile_id);
  const availableUsers = (potentialWardens || []).filter(u => !existingWardenIds.includes(u.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Warden Management
          </h1>
          <p className="text-muted-foreground">
            Assign wardens to manage hostel students and approvals
          </p>
        </div>
      </div>

      {/* Warden Management Component */}
      <WardenManagement 
        wardens={wardens as (Warden & { profile?: Profile })[] || []}
        availableUsers={availableUsers as (Profile & { role: string })[] || []}
        hostels={uniqueHostels}
        wardensByHostel={wardensByHostel}
      />

      {/* Hostel Overview */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Hostel Overview</h2>
              <p className="text-sm text-muted-foreground">
                {uniqueHostels.length} hostels with students
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueHostels.map(hostel => {
              const hostelWardens = wardensByHostel[hostel] || [];
              const hasWardens = hostelWardens.length > 0;
              
              return (
                <div 
                  key={hostel}
                  className={clsx(
                    'p-4 rounded-xl border',
                    hasWardens 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-orange-500/5 border-orange-500/20'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className={clsx(
                        'w-5 h-5',
                        hasWardens ? 'text-green-600' : 'text-orange-600'
                      )} />
                      <h3 className="font-bold text-foreground">{hostel}</h3>
                    </div>
                    {hasWardens ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    )}
                  </div>
                  
                  {hostelWardens.length > 0 ? (
                    <div className="space-y-2">
                      {hostelWardens.map(w => (
                        <div key={w.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-500" />
                          </div>
                          <span className="text-foreground truncate">
                            {w.profile?.full_name || 'Unknown'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      No warden assigned
                    </p>
                  )}
                </div>
              );
            })}
            
            {uniqueHostels.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hostels found. Students need hostel assignments first.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
