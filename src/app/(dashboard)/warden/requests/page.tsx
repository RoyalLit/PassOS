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
import type { WardenPendingRequest } from '@/types';

export default async function WardenRequestsPage() {
  const profile = await requireWarden();
  const supabase = await createServerSupabaseClient();
  
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
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
    .eq('role', 'student')
    .in('student_id', 
      supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .in('hostel', hostels)
    )
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
      {requests && requests.length > 0 ? (
        <div className="space-y-4">
          {(requests as WardenPendingRequest[]).map((request) => {
            const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
            const type = typeConfig[request.request_type as keyof typeof typeConfig] || { label: request.request_type, color: 'slate' };
            const student = request.student;
            const parent = student?.parent;
            
            return (
              <div 
                key={request.id}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Student Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            {student?.avatar_url ? (
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
                            <h3 className="font-bold text-foreground">
                              {student?.full_name || 'Unknown Student'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {student?.hostel} {student?.room_number && `• Room ${student.room_number}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant="outline"
                            className={clsx(
                              'capitalize',
                              type.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                              type.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                              type.color === 'red' ? 'bg-red-500/10 text-red-600' :
                              type.color === 'green' ? 'bg-green-500/10 text-green-600' :
                              'bg-orange-500/10 text-orange-600'
                            )}
                          >
                            {type.label}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={clsx('capitalize', status.color)}
                          >
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Request Details */}
                      <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Reason</p>
                          <p className="text-sm text-foreground font-medium">{request.reason}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Destination</p>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {request.destination}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Departure</p>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(request.departure_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Return By</p>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(request.return_by), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Parent Info */}
                      {parent && (
                        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                          <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider font-bold mb-2">
                            Parent / Guardian
                          </p>
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{parent.full_name}</span>
                            </div>
                            {parent.email && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{parent.email}</span>
                              </div>
                            )}
                            {parent.phone && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{parent.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="lg:w-64 shrink-0">
                      <RequestActions 
                        requestId={request.id}
                        currentStatus={request.status}
                        approverType="warden"
                        studentId={request.student_id}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-sm p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-500/50 mb-4" />
          <h3 className="font-bold text-foreground mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            No pending requests from your hostel students.
          </p>
        </div>
      )}
    </div>
  );
}
