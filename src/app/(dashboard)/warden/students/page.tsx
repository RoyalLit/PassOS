import { requireWarden } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Mail, Phone, AlertTriangle, Search } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import type { Profile } from '@/types';

interface StudentWithState extends Profile {
  student_states?: { current_state: string; active_pass_id: string | null }[];
  parent?: Profile;
}

interface SearchParams {
  filter?: string;
  search?: string;
}

export default async function WardenStudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter = params.filter || 'all';
  const search = params.search || '';
  
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();
  
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  // Get students from warden's hostels (or all if unassigned)
  let query = supabase
    .from('profiles')
    .select(`
      *,
      parent:profiles!parent_id(id, full_name, email, phone),
      student_states(current_state, active_pass_id)
    `)
    .eq('role', 'student');

  if (hostels.length > 0) {
    query = query.in('hostel', hostels);
  }
  
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,room_number.ilike.%${search}%`);
  }
  
  const { data: students } = await query;
  
  // Filter by state if specified
  const filteredStudents = (students || []).filter((student: StudentWithState) => {
    const state = student.student_states?.[0]?.current_state || 'inside';
    
    if (filter === 'inside' && state !== 'inside') return false;
    if (filter === 'outside' && state !== 'outside') return false;
    if (filter === 'overdue' && state !== 'overdue') return false;
    
    return true;
  });
  
  const stateColors = {
    inside: 'bg-green-500/10 text-green-600 dark:text-green-400',
    outside: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  
  const stateLabels = {
    inside: 'Inside',
    outside: 'Outside',
    overdue: 'Overdue',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Student Directory
          </h1>
          <p className="text-muted-foreground">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} {hostels.length > 0 ? 'in your hostels' : 'across all hostels'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search by name, email, or room..."
            defaultValue={search}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>
        
        <div className="flex gap-2">
          {['all', 'inside', 'outside', 'overdue'].map((f) => (
            <Link
              key={f}
              href={`/warden/students?filter=${f}${search ? `&search=${search}` : ''}`}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
                filter === f
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/20'
              )}
            >
              {f}
            </Link>
          ))}
        </div>
      </div>

      {/* Student Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student: StudentWithState) => {
            const state = student.student_states?.[0]?.current_state || 'inside';
            
            return (
              <div 
                key={student.id}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden hover:border-blue-500/30 transition-all group"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border bg-muted/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        {student.avatar_url ? (
                          <img 
                            src={student.avatar_url} 
                            alt="" 
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                          {student.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={clsx(
                        'capitalize',
                        stateColors[state as keyof typeof stateColors]
                      )}
                    >
                      {stateLabels[state as keyof typeof stateLabels]}
                    </Badge>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{student.hostel}</span>
                    {student.room_number && (
                      <span className="text-muted-foreground/60">• Room {student.room_number}</span>
                    )}
                  </div>
                  
                  {student.parent && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Parent / Guardian
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{student.parent.full_name}</span>
                        </div>
                        {student.parent.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{student.parent.email}</span>
                          </div>
                        )}
                        {student.parent.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{student.parent.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {student.is_flagged && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Flagged: {student.flag_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-sm p-12 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-bold text-foreground mb-2">No students found</h3>
          <p className="text-muted-foreground">
            {search 
              ? `No students match "${search}"`
              : filter !== 'all' 
                ? `No students are currently ${filter}`
                : hostels.length > 0 
                  ? 'No students assigned to your hostels'
                  : 'No students found in the system'
            }
          </p>
        </div>
      )}
    </div>
  );
}
