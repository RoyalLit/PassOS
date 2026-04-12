'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { 
  CheckCircle, Clock, GraduationCap, Loader2, AlertTriangle, MapPin,
  ChevronDown, ChevronUp, Link2, ShieldAlert, Send, ArrowRight,
  LogOut, LogIn, Home, ShieldCheck, AlertCircle, RefreshCcw,
  CalendarClock, Navigation
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { REQUEST_TYPES, STATUS_CONFIG } from '@/lib/constants';
import type { PassRequest } from '@/types';
import { RequestIcon } from '@/components/requests/request-icon';
import { SkeletonParentPortal } from '@/components/ui/skeleton';

interface RecentPass {
  id: string;
  status: string;
  valid_from: string;
  valid_until: string;
  exit_at: string | null;
  entry_at: string | null;
  created_at: string;
  request?: {
    request_type: string;
    destination: string;
    reason: string;
    departure_at: string;
    return_by: string;
  } | null;
}

interface StudentState {
  current_state: 'inside' | 'outside' | 'overdue';
  active_pass_id: string | null;
  last_exit: string | null;
  last_entry: string | null;
  updated_at: string;
}

interface ParentData {
  student: {
    id: string;
    full_name: string;
    email: string;
    hostel: string | null;
    room_number: string | null;
    avatar_url: string | null;
  } | null;
  requests: PassRequest[];
  studentState: StudentState | null;
  activePass: RecentPass | null;
  recentPasses: RecentPass[];
}

// Countdown timer component
function CountdownTimer({ validUntil }: { validUntil: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const update = () => {
      const target = new Date(validUntil);
      const now = new Date();
      const diff = differenceInMinutes(target, now);
      if (diff < 0) {
        setIsOverdue(true);
        setTimeLeft(`${Math.abs(diff)}m overdue`);
      } else if (diff < 60) {
        setTimeLeft(`${diff}m left`);
      } else {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        setTimeLeft(`${h}h ${m}m left`);
      }
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [validUntil]);

  return (
    <span className={clsx(
      'text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
      isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-white/20 text-white/80'
    )}>
      {timeLeft}
    </span>
  );
}

// Campus Status Hero Card
function CampusStatusCard({ student, studentState, activePass }: {
  student: ParentData['student'];
  studentState: StudentState | null;
  activePass: RecentPass | null;
}) {
  const state = studentState?.current_state ?? 'inside';
  const isOutside = state === 'outside' || state === 'overdue';
  const isOverdue = state === 'overdue';

  const bgClass = isOverdue
    ? 'from-red-700 to-red-900'
    : isOutside
    ? 'from-amber-600 to-orange-700'
    : 'from-green-600 to-emerald-700';

  const icon = isOverdue ? AlertCircle : isOutside ? Navigation : ShieldCheck;
  const Icon = icon;

  const statusLabel = isOverdue ? 'Overdue — Off Campus' : isOutside ? 'Currently Off Campus' : 'On Campus — Safe';
  const statusSub = isOverdue
    ? `Should have returned ${activePass?.valid_until ? formatDistanceToNow(new Date(activePass.valid_until), { addSuffix: true }) : ''}`
    : isOutside && activePass
    ? `Returning by ${format(new Date(activePass.valid_until), 'h:mm a, MMM d')}`
    : studentState?.last_entry
    ? `Last returned ${formatDistanceToNow(new Date(studentState.last_entry), { addSuffix: true })}`
    : 'No pass history yet';

  return (
    <div className={clsx(
      'rounded-3xl p-7 text-white shadow-2xl relative overflow-hidden bg-gradient-to-br transition-all',
      bgClass
    )}>
      {/* Decorative circle */}
      <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden shrink-0">
              {student?.avatar_url ? (
                <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="w-7 h-7 text-white/80" />
              )}
            </div>
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-0.5">Your Ward</p>
              <h2 className="text-xl font-black text-white">{student?.full_name}</h2>
              <p className="text-white/60 text-xs mt-0.5">{[student?.hostel, student?.room_number ? `Room ${student.room_number}` : null].filter(Boolean).join(' • ')}</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-3 shrink-0">
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-end justify-between gap-4">
          <div>
            <p className="text-white font-black text-lg leading-tight">{statusLabel}</p>
            <p className="text-white/60 text-sm mt-1">{statusSub}</p>
            {isOutside && activePass?.request?.destination && (
              <div className="flex items-center gap-1.5 mt-2 text-white/70 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5" />
                <span>Destination: {activePass.request.destination}</span>
              </div>
            )}
          </div>
          {isOutside && activePass?.valid_until && (
            <CountdownTimer validUntil={activePass.valid_until} />
          )}
        </div>
      </div>
    </div>
  );
}

// Timeline event row
function TimelineEvent({ pass }: { pass: RecentPass }) {
  const req = pass.request;
  const typeConfig = req ? REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES] : null;

  const events = [
    pass.exit_at && { time: pass.exit_at, label: 'Exited Campus', icon: LogOut, color: 'text-orange-400 bg-orange-400/10' },
    pass.entry_at && { time: pass.entry_at, label: 'Returned to Campus', icon: LogIn, color: 'text-green-400 bg-green-400/10' },
  ].filter(Boolean) as { time: string; label: string; icon: typeof LogOut; color: string }[];

  const statusBadge = pass.status === 'active'
    ? { label: 'Active', class: 'text-blue-400 bg-blue-400/10 border-blue-400/20' }
    : pass.status === 'used_exit'
    ? { label: 'Currently Out', class: 'text-amber-400 bg-amber-400/10 border-amber-400/20' }
    : pass.status === 'used_entry'
    ? { label: 'Completed', class: 'text-green-400 bg-green-400/10 border-green-400/20' }
    : { label: pass.status, class: 'text-muted-foreground bg-muted border-border' };

  return (
    <div className="p-5 group hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          typeConfig?.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
          typeConfig?.color === 'purple' ? 'bg-purple-500/10 text-purple-500' :
          'bg-muted text-muted-foreground'
        )}>
          <RequestIcon iconName={typeConfig?.icon || 'CalendarClock'} className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">{typeConfig?.label || req?.request_type || 'Pass'}</span>
            <span className={clsx('text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border', statusBadge.class)}>
              {statusBadge.label}
            </span>
          </div>

          {req && (
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.destination}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{format(new Date(req.departure_at), 'MMM d, h:mm a')}</span>
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {events.map((ev) => {
                const EvIcon = ev.icon;
                return (
                  <div key={ev.time} className="flex items-center gap-2 text-xs">
                    <div className={clsx('w-5 h-5 rounded-md flex items-center justify-center', ev.color)}>
                      <EvIcon className="w-3 h-3" />
                    </div>
                    <span className="text-muted-foreground">{ev.label}</span>
                    <span className="font-bold text-foreground">{format(new Date(ev.time), 'h:mm a, MMM d')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ParentPortal() {
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Linking state
  const [studentIdInput, setStudentIdInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/parent/requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30s auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
    return <div className="p-6 max-w-4xl mx-auto"><SkeletonParentPortal /></div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex items-start gap-4 text-red-500 shadow-sm">
          <AlertTriangle className="shrink-0 mt-0.5 w-6 h-6" />
          <div>
            <p className="font-bold text-lg text-foreground">Unable to load portal</p>
            <p className="text-sm mt-1 text-muted-foreground">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition-colors">
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
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            Live status {lastRefresh && <span className="text-xs opacity-60">· Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-2.5 rounded-xl bg-muted border border-border hover:bg-card transition-all active:scale-95"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4 text-muted-foreground" />
          </button>
          {data?.student && (
            <Link
              href="/parent/request-for-student"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              Request for Student
            </Link>
          )}
        </div>
      </div>

      {/* Campus Status Hero OR Linking Form */}
      {data?.student ? (
        <CampusStatusCard
          student={data.student}
          studentState={data.studentState}
          activePass={data.activePass}
        />
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
            <input
              type="text"
              required
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
              placeholder="Paste Student ID here..."
              className="w-full h-14 bg-background border-2 border-border rounded-2xl px-5 text-center font-mono text-sm focus:bg-card focus:border-blue-500 outline-none transition-all text-foreground"
            />
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

      {/* Main Content (only when linked) */}
      {data?.student && (
        <>
          {/* Pending Approval Requests */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Awaiting Your Approval
              </h2>
              {pendingRequests.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                  {pendingRequests.length} pending
                </span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border border-dashed p-10 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground/30 flex items-center justify-center mx-auto mb-3 border border-border shadow-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="font-bold text-foreground">All requests reviewed</p>
                <p className="text-muted-foreground text-sm mt-1">No pending items right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => {
                  const typeConfig = REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES] || {
                    label: req.request_type.replace('_', ' '), icon: 'AlertTriangle', color: 'slate'
                  };
                  const isExpanded = expandedId === req.id;
                  const isDeciding = deciding === req.id;

                  return (
                    <div key={req.id} className={clsx(
                      'bg-card rounded-2xl border border-border shadow-sm transition-all overflow-hidden',
                      isExpanded ? 'ring-2 ring-blue-500 border-transparent shadow-lg' : 'hover:border-blue-500/30'
                    )}>
                      <button className="w-full p-6 flex items-center gap-5 text-left" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                        <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
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
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{format(new Date(req.departure_at), 'HH:mm · MMM d')}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{req.destination}</span>
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

          {/* Pass Activity Timeline */}
          {data.recentPasses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-500" />
                  Pass Activity
                </h2>
                <span className="text-xs text-muted-foreground">Last {data.recentPasses.length} passes</span>
              </div>
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
                {data.recentPasses.map(pass => (
                  <TimelineEvent key={pass.id} pass={pass} />
                ))}
              </div>
            </div>
          )}

          {/* Request History (compact) */}
          {historyRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                Recent Decisions
                <span className="text-sm font-normal text-muted-foreground">· {historyRequests.length} total</span>
              </h2>
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
                {historyRequests.map((req) => {
                  const typeConfig = REQUEST_TYPES[req.request_type as keyof typeof REQUEST_TYPES] || { label: req.request_type.replace('_', ' '), icon: 'AlertTriangle', color: 'slate' };
                  const statusConfig = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                  return (
                    <div key={req.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/30 transition-colors group">
                      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        typeConfig?.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                        typeConfig?.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                        'bg-muted text-muted-foreground'
                      )}>
                        <RequestIcon iconName={typeConfig?.icon || 'AlertTriangle'} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">{typeConfig.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest font-black">
                          {format(new Date(req.departure_at), 'MMMM do')} · {req.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {statusConfig && (
                          <span className={clsx('px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 shadow-sm border', statusConfig.color)}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
                            {statusConfig.label}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-all" />
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
