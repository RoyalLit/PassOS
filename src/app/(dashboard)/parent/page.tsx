'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle, Clock, 
  GraduationCap, Loader2, AlertTriangle, MapPin, ChevronDown, ChevronUp,
  Link2, ShieldAlert, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { REQUEST_TYPES, STATUS_CONFIG } from '@/lib/constants';
import type { PassRequest, Profile } from '@/types';
import { RequestIcon } from '@/components/requests/request-icon';
import { SkeletonParentPortal } from '@/components/ui/skeleton';

interface ParentData {
  student: Pick<Profile, 'id' | 'full_name' | 'email' | 'hostel' | 'room_number'> | null;
  requests: PassRequest[];
}

export default function ParentPortal() {
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  
  // Linking state
  const [studentIdInput, setStudentIdInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/parent/requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinking(true);
    setLinkError('');
    
    try {
      const res = await fetch('/api/parent/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentIdInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      // Success! Refresh data
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link with student';
      setLinkError(message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDecide = async (request_id: string, decision: 'approved' | 'rejected') => {
    setDeciding(request_id);
    try {
      const res = await fetch('/api/parent/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, decision, reason: reasons[request_id] || '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      // Refresh data
      await fetchData();
      setExpandedId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit decision';
      alert(message);
    } finally {
      setDeciding(null);
    }
  };

  const pendingRequests = data?.requests.filter(r => 
    ['parent_pending', 'pending'].includes(r.status)
  ) || [];
  const historyRequests = data?.requests.filter(r =>
    !['parent_pending', 'pending'].includes(r.status)
  ) || [];

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <SkeletonParentPortal />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex items-start gap-4 text-red-500 shadow-sm">
          <AlertTriangle className="shrink-0 mt-0.5 w-6 h-6" />
          <div>
            <p className="font-bold text-lg text-foreground">Unable to load portal</p>
            <p className="text-sm mt-1 text-muted-foreground">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Parent Portal</h1>
          <p className="text-muted-foreground mt-1 text-base">Review and manage gate pass requests for your ward.</p>
        </div>
      </div>

      {/* Student Profile / Linking Form */}
      {data?.student ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-0.5">Linked Ward</p>
              <h2 className="font-bold text-foreground text-xl truncate">{data.student.full_name}</h2>
              <p className="text-muted-foreground text-sm truncate flex items-center gap-2 mt-0.5">
                {data.student.email}
                {(data.student.hostel || data.student.room_number) && (
                  <>
                    <span>•</span>
                    <span>{[data.student.hostel, data.student.room_number].filter(Boolean).join(' - Room ')}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-wider border border-green-500/20">
            <CheckCircle className="w-3 h-3" /> Linked
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border-2 border-dashed border-border p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-6">
            <Link2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Connect with your student</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Please enter your ward&apos;s unique Student ID to link your accounts and begin receiving gate pass requests. 
            <span className="block mt-2 font-medium">Your child can find this ID on their dashboard.</span>
          </p>
 
          <form onSubmit={handleLinkStudent} className="max-w-md mx-auto space-y-4">
            {linkError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium flex items-center gap-2 text-left mb-4 border border-red-500/20">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {linkError}
              </div>
            )}
            <div className="relative group">
              <input
                type="text"
                required
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                placeholder="Paste Student ID here..."
                className="w-full h-14 bg-background border-2 border-border rounded-2xl px-5 text-center font-mono text-sm focus:bg-card focus:border-blue-500 outline-none transition-all text-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={isLinking || !studentIdInput.trim()}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {isLinking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Link2 className="w-6 h-6" />}
              Link Student Account
            </button>
          </form>
        </div>
      )}

      {/* Main Content (Requests) Only shown if linked */}
      {data?.student && (
        <>
          {/* Pending Requests */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Awaiting Approval
              </h2>
              {pendingRequests.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                  {pendingRequests.length} pending
                </span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border border-dashed p-12 text-center group shadow-sm transition-all hover:bg-muted/30">
                <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground/30 flex items-center justify-center mx-auto mb-4 border border-border shadow-sm group-hover:text-green-500 group-hover:bg-card transition-all">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <p className="font-bold text-foreground text-lg">All requests reviewed</p>
                <p className="text-muted-foreground text-sm mt-1">You&apos;ve successfully addressed all pending items.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => {
                  const typeConfig = REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES] || { 
                    label: req.request_type.replace('_', ' '),
                    icon: 'AlertTriangle',
                    color: 'slate'
                  };
                  const isExpanded = expandedId === req.id;
                  const isDeciding = deciding === req.id;

                  return (
                    <div key={req.id} className={clsx(
                      "bg-card rounded-2xl border border-border shadow-sm transition-all overflow-hidden",
                      isExpanded ? "ring-2 ring-blue-500 border-transparent shadow-lg" : "hover:border-blue-500/30"
                    )}>
                      <button
                        className="w-full p-6 flex items-center gap-5 text-left transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                          typeConfig?.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                          typeConfig?.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                          'bg-muted text-muted-foreground'
                        )}>
                          <RequestIcon iconName={typeConfig?.icon || 'AlertTriangle'} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-lg leading-tight">{typeConfig.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1 truncate font-medium">{req.reason}</p>
                          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(req.departure_at), 'HH:mm • MMM d')}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {req.destination}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-muted-foreground/30">
                          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-6 pt-6 pb-6 space-y-6 bg-muted/20 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Departure</p>
                              <p className="font-bold text-foreground">{format(new Date(req.departure_at), 'PPPp')}</p>
                            </div>
                            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Return Expectation</p>
                              <p className="font-bold text-foreground">{format(new Date(req.return_by), 'PPPp')}</p>
                            </div>
                          </div>
 
                          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Detailed Reason</p>
                            <p className="text-foreground/80 italic leading-relaxed font-medium">&ldquo;{req.reason}&rdquo;</p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                              Guardian Message <span className="text-muted-foreground/40 font-normal">(Optional)</span>
                            </label>
                            <textarea
                              rows={3}
                              value={reasons[req.id] || ''}
                              onChange={(e) => setReasons(prev => ({ ...prev, [req.id]: e.target.value }))}
                              placeholder="E.g. Call us when you reach. Be safe!"
                              className="w-full border-2 border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-background font-medium text-foreground transition-all"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              onClick={() => handleDecide(req.id, 'rejected')}
                              disabled={isDeciding}
                              className="flex-1 h-14 rounded-2xl font-bold border-2 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40 transition-all disabled:opacity-50 text-sm active:scale-[0.98]"
                            >
                              Reject Request
                            </button>
                            <button
                              onClick={() => handleDecide(req.id, 'approved')}
                              disabled={isDeciding}
                              className="flex-1 h-14 rounded-2xl font-bold bg-green-600 text-white hover:bg-green-700 transition-all shadow-xl shadow-green-500/10 disabled:opacity-50 flex items-center justify-center gap-3 text-sm active:scale-[0.98]"
                            >
                              {isDeciding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                              Approve Release
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          {historyRequests.length > 0 && (
            <div className="pt-4">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                Recent Decisions
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mx-2" />
                <span className="text-sm font-normal text-muted-foreground">Past {historyRequests.length} events</span>
              </h2>
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
                {historyRequests.map((req) => {
                  const typeConfig = REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES] || {
                    label: req.request_type.replace('_', ' '),
                    icon: 'AlertTriangle',
                    color: 'slate'
                  };
                  const statusConfig = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                  return (
                    <div key={req.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/30 transition-colors group">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        typeConfig?.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                        typeConfig?.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                        'bg-muted text-muted-foreground'
                      )}>
                        <RequestIcon iconName={typeConfig?.icon || 'AlertTriangle'} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">{typeConfig.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-black">
                          {format(new Date(req.departure_at), 'MMMM do')} • {req.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border">
                        <span className={clsx('px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 shadow-sm border', statusConfig.color)}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
                          {statusConfig.label}
                        </span>
                        <div className="hidden group-hover:block transition-all">
                          <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
