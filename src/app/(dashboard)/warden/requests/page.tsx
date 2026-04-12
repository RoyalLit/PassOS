import { requireWarden } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, User, Clock, MapPin, Calendar, 
  CheckCircle2, XCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { RequestActions } from '@/components/requests/request-actions';
import { BulkRequestList } from '@/components/requests/bulk-request-list';
import type { WardenPendingRequest, PassRequest } from '@/types';

export default async function WardenRequestsPage() {
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();
  
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  // First get student IDs from warden's hostels (or all if unassigned)
  let studentQuery = supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('tenant_id', profile.tenant_id);
  
  if (hostels.length > 0) {
    studentQuery = studentQuery.in('hostel', hostels);
  }

  const { data: hostelStudents } = await studentQuery;
  
  const studentIds = hostelStudents?.map(s => s.id) || [];
  
  // Get pending requests from warden's hostels
  const { data: requests } = await supabase
    .from('pass_requests')
    .select(`
      *,
      student:profiles(
        *,
        parent:profiles!parent_id(id, full_name, email, phone),
        student_states(current_state)
      )
    `)
    .in('student_id', studentIds)
    .in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved'])
    .order('created_at', { ascending: false });
  
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-muted/50 text-muted-foreground' },
    parent_pending: { label: 'Awaiting Parent', color: 'bg-amber-500/10 text-amber-500' },
    parent_approved: { label: 'Parent Approved', color: 'bg-emerald-500/10 text-emerald-500' },
    admin_pending: { label: 'Awaiting Admin', color: 'bg-violet-500/10 text-violet-500' },
  };
  
  const typeConfig = {
    day_outing: { label: 'Day Outing', color: 'blue' },
    overnight: { label: 'Overnight', color: 'purple' },
    emergency: { label: 'Emergency', color: 'red' },
    medical: { label: 'Medical', color: 'green' },
    academic: { label: 'Academic', color: 'orange' },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pending Approvals
          </h1>
          <p className="text-muted-foreground">
            {requests?.length || 0} request{requests?.length !== 1 ? 's' : ''} awaiting review
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

      {/* Request List */}
      <div className="mt-6">
        <BulkRequestList requests={(requests as unknown as PassRequest[]) || []} isAdminView={true} />
      </div>

    </div>
  );
}
