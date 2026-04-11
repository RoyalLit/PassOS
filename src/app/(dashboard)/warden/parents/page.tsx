import { requireWarden } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, User, Mail, Phone, Users, Search,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import type { Profile } from '@/types';

interface ParentWithChildren extends Profile {
  children?: (Profile & { student_states?: { current_state: string }[] })[];
}

export default async function WardenParentsPage() {
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();
  
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  // Get parents of students in warden's hostels
  const { data: parents } = await supabase
    .from('profiles')
    .select(`
      *,
      children:profiles!parent_id(
        id,
        full_name,
        hostel,
        room_number,
        avatar_url,
        student_states(current_state)
      )
    `)
    .eq('role', 'parent')
    .order('full_name');

  // Filter to only show parents whose children are in warden's hostels
  const filteredParents = (parents || []).filter((parent: ParentWithChildren) => {
    const children = parent.children || [];
    return children.some((child: Profile & { student_states?: { current_state: string }[] }) => 
      hostels.includes(child.hostel || '')
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Parent Directory
          </h1>
          <p className="text-muted-foreground">
            {filteredParents.length} parent{filteredParents.length !== 1 ? 's' : ''} of hostel students
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hostels.map(hostel => (
            <span 
              key={hostel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium"
            >
              <Building2 className="w-4 h-4" />
              {hostel}
            </span>
          ))}
        </div>
      </div>

      {/* Parent List */}
      {filteredParents.length > 0 ? (
        <div className="space-y-4">
          {filteredParents.map((parent: ParentWithChildren) => {
            const children = parent.children || [];
            const hostelChildren = children.filter((child: Profile & { student_states?: { current_state: string }[] }) => 
              hostels.includes(child.hostel || '')
            );

            return (
              <div 
                key={parent.id}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden"
              >
                {/* Parent Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      {parent.avatar_url ? (
                        <img 
                          src={parent.avatar_url} 
                          alt="" 
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        <Users className="w-7 h-7 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground">
                        {parent.full_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {parent.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {parent.email}
                          </span>
                        )}
                        {parent.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {parent.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                      {hostelChildren.length} ward{hostelChildren.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                
                {/* Children */}
                <div className="p-4 bg-muted/20">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Children in Your Hostels
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {hostelChildren.map((child: Profile & { student_states?: { current_state: string }[] }) => {
                      const state = child.student_states?.[0]?.current_state || 'inside';
                      
                      return (
                        <Link
                          key={child.id}
                          href={`/warden/students?search=${encodeURIComponent(child.full_name)}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-blue-500/30 transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            {child.avatar_url ? (
                              <img 
                                src={child.avatar_url} 
                                alt="" 
                                className="w-full h-full rounded-lg object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {child.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {child.hostel} {child.room_number && `• ${child.room_number}`}
                            </p>
                          </div>
                          <span className={clsx(
                            'w-2 h-2 rounded-full shrink-0',
                            state === 'inside' ? 'bg-green-500' :
                            state === 'outside' ? 'bg-blue-500' :
                            'bg-red-500'
                          )} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-sm p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-bold text-foreground mb-2">No parents found</h3>
          <p className="text-muted-foreground">
            No parents have linked students in your hostels yet.
          </p>
        </div>
      )}
    </div>
  );
}
