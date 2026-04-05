import { requireRole } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  ArrowLeft, Mail, Phone, MapPin, Users, 
  History, ShieldAlert, GraduationCap, Link2, 
  Unlink, ExternalLink, Activity, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { STATUS_CONFIG, REQUEST_TYPES } from '@/lib/constants';
import { RequestIcon } from '@/components/requests/request-icon';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  
  // In Next.js 15+, params is a Promise that must be awaited
  const { id } = await params;
  
  if (!id) {
    console.error('[Admin] Student ID is missing from route parameters');
    return notFound();
  }

  const supabase = createAdminClient();

  // 1. Fetch student profile with their parent and current state
  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select(`
      *,
      parent:profiles!parent_id(*),
      state:student_states(*)
    `)
    .eq('id', id)
    .single();

  if (studentError) {
    console.error(`[Admin] Error fetching student ${id}:`, studentError);
    if (studentError.code === 'PGRST116') { // No rows found
      return notFound();
    }
    // Return a visible error instead of a blank page
    return (
      <div className="p-12 text-center">
        <div className="bg-red-50 border border-red-100 rounded-3xl p-12 max-w-xl mx-auto space-y-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Database Connection Error</h1>
          <p className="text-slate-600">{studentError.message}</p>
          <Link href="/admin/students" className="inline-block bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch student's request history
  const { data: requests, error: requestsError } = await supabase
    .from('pass_requests')
    .select('*')
    .eq('student_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (requestsError) {
    console.error(`[Admin] Error fetching requests for ${id}:`, requestsError);
  }

  // Handle state being either an array or an object (Supabase behavior varies)
  const stateData = Array.isArray(student.state) ? student.state[0] : student.state;
  const currentStatus = stateData?.current_state || 'inside';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs & Actions */}
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/students" 
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Directory
        </Link>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors">
            Edit Profile
          </button>
          <button className={clsx(
            "px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all",
            student.is_flagged 
              ? "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100" 
              : "bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100"
          )}>
            {student.is_flagged ? 'Clear Flag' : 'Flag Student'}
          </button>
        </div>
      </div>

      {/* Hero Profile Header */}
      <div className="bg-white rounded-3xl border shadow-sm p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <GraduationCap className="w-48 h-48" />
        </div>
        
        <div className="w-32 h-32 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border-4 border-white shadow-xl">
          <span className="text-4xl font-black">{student.full_name?.charAt(0) || '?'}</span>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{student.full_name}</h1>
            <p className="text-slate-500 font-medium mt-1">{student.email}</p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <span className={clsx(
              "px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm",
              currentStatus === 'inside' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
            )}>
              <span className={clsx("w-2 h-2 rounded-full", currentStatus === 'inside' ? "bg-green-500" : "bg-blue-500")} />
              Currently {currentStatus}
            </span>
            {student.is_flagged && (
              <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 border border-red-200">
                <ShieldAlert className="w-3.5 h-3.5" /> High Attention Required
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Contact & Housing Card */}
          <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600" /> Essential Information
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</h3>
                    <p className="font-bold text-slate-900">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</h3>
                    <p className="font-bold text-slate-900">{student.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hostel</h3>
                    <p className="font-bold text-slate-900">{student.hostel || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Room</h3>
                    <p className="font-bold text-slate-900">{student.room_number ? `Room ${student.room_number}` : 'Unassigned'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity History */}
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <History className="w-5 h-5 text-slate-900" /> Recent Activity
              </h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {requests && requests.length > 0 ? requests.map((req) => {
                const statusConfig = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                const typeConfig = REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES];
                return (
                  <div key={req.id} className="p-8 flex flex-col sm:flex-row justify-between gap-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-6">
                      <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        typeConfig?.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        typeConfig?.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                        'bg-slate-50 text-slate-600'
                      )}>
                        <RequestIcon iconName={typeConfig?.icon || 'clock'} className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 text-lg leading-tight">{typeConfig?.label || 'General'}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{req.reason}</p>
                        <div className="flex items-center gap-3 pt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {format(new Date(req.departure_at), 'MMM d, p')}</span>
                          <span>•</span>
                          <span>{req.destination}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center sm:justify-end shrink-0">
                      <span className={clsx(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                        statusConfig?.color || 'bg-slate-100 text-slate-600'
                      )}>
                        <span className={clsx("w-2 h-2 rounded-full", statusConfig?.dot || 'bg-slate-400')} />
                        {statusConfig?.label || req.status}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-16 text-center text-slate-400">
                  <p className="font-bold">No requests found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Supervision & Meta */}
        <div className="space-y-8">
          {/* Parent Supervision Card */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Users className="w-24 h-24" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-400" /> Parental Link
              </h2>

              {student.parent ? (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Linked Guardian</p>
                    <p className="font-bold text-white text-lg">{student.parent.full_name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{student.parent.email}</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                      <Unlink className="w-4 h-4 text-red-400" /> Unlink
                    </button>
                    <Link 
                      href={`/admin/parents/${student.parent.id}`}
                      className="w-12 h-14 bg-white text-slate-900 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all shadow-lg"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-sm text-slate-400 italic">No parent account linked to this student.</p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-blue-900/50 flex items-center justify-center gap-2">
                      <Link2 className="w-4 h-4" /> Link Parent Account
                    </button>
                    <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest leading-relaxed">
                      Parents must sign up for an account before they can be linked to a student.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Technical Info */}
          <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">System Identity</h3>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Platform UUID</p>
                <p className="font-mono text-xs text-slate-600 break-all">{student.id}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Registration Time</p>
                <p className="font-mono text-xs text-slate-600 break-all">{student.created_at ? format(new Date(student.created_at), 'PPPp') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
