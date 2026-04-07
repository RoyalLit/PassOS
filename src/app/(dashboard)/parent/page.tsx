'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle, XCircle, Clock, User, 
  GraduationCap, Loader2, AlertTriangle, MapPin, ChevronDown, ChevronUp,
  Link2, ShieldAlert, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { REQUEST_TYPES, STATUS_CONFIG } from '@/lib/constants';
import type { PassRequest, Profile } from '@/types';
import { RequestIcon } from '@/components/requests/request-icon';

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
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
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
    } catch (err: any) {
      setLinkError(err.message || 'Failed to link with student');
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
    } catch (err: any) {
      alert(err.message || 'Failed to submit decision');
    } finally {
      setDeciding(null);
    }
  };

  const pendingRequests = data?.requests.filter(r => 
    ['parent_pending', 'ai_review', 'pending'].includes(r.status)
  ) || [];
  const historyRequests = data?.requests.filter(r =>
    !['parent_pending', 'ai_review', 'pending'].includes(r.status)
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex items-start gap-4 text-red-700 shadow-sm">
          <AlertTriangle className="shrink-0 mt-0.5 w-6 h-6" />
          <div>
            <p className="font-bold text-lg">Unable to load portal</p>
            <p className="text-sm mt-1 opacity-90">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm"
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Parent Portal</h1>
          <p className="text-slate-500 mt-1">Review and manage gate pass requests for your ward.</p>
        </div>
      </div>

      {/* Student Profile / Linking Form */}
      {data?.student ? (
        <div className="bg-white rounded-2xl border shadow-sm p-6 flex items-center justify-between group hover:border-blue-100 transition-colors">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-0.5">Linked Ward</p>
              <h2 className="font-bold text-slate-900 text-xl truncate">{data.student.full_name}</h2>
              <p className="text-slate-400 text-sm truncate flex items-center gap-2 mt-0.5">
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
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle className="w-3 h-3" /> Linked
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-6">
            <Link2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect with your student</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
            Please enter your ward's unique Student ID to link your accounts and begin receiving gate pass requests. 
            <span className="block mt-2 font-medium">Your child can find this ID on their dashboard.</span>
          </p>

          <form onSubmit={handleLinkStudent} className="max-w-md mx-auto space-y-4">
            {linkError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2 text-left mb-4">
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
                className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 text-center font-mono text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLinking || !studentIdInput.trim()}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
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
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Awaiting Approval
              </h2>
              {pendingRequests.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold ring-4 ring-amber-50">
                  {pendingRequests.length} pending
                </span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-slate-50 rounded-3xl border-2 border-dashed p-12 text-center group">
                <div className="w-16 h-16 rounded-2xl bg-white text-slate-300 flex items-center justify-center mx-auto mb-4 border shadow-sm group-hover:text-green-500 transition-colors">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <p className="font-bold text-slate-900 text-lg">All requests reviewed</p>
                <p className="text-slate-500 text-sm mt-1">You've successfully addressed all pending items.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => {
                  const typeConfig = (REQUEST_TYPES as any)[req.request_type] || { 
                    label: req.request_type.replace('_', ' '),
                    icon: 'AlertTriangle',
                    color: 'slate'
                  };
                  const isExpanded = expandedId === req.id;
                  const isDeciding = deciding === req.id;

                  return (
                    <div key={req.id} className={clsx(
                      "bg-white rounded-2xl border shadow-sm transition-all overflow-hidden",
                      isExpanded ? "ring-2 ring-blue-500 border-transparent shadow-lg" : "hover:border-blue-100"
                    )}>
                      <button
                        className="w-full p-6 flex items-center gap-5 text-left transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                          typeConfig?.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                          typeConfig?.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                          'bg-slate-100 text-slate-500'
                        )}>
                          <RequestIcon iconName={typeConfig?.icon || 'AlertTriangle'} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-lg leading-tight">{typeConfig.label}</h3>
                          <p className="text-sm text-slate-500 mt-1 truncate font-medium">{req.reason}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(req.departure_at), 'HH:mm • MMM d')}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {req.destination}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-slate-300">
                          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t px-6 pt-6 pb-6 space-y-6 bg-slate-50/50 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl p-4 border shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Departure</p>
                              <p className="font-bold text-slate-900">{format(new Date(req.departure_at), 'PPPp')}</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 border shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Return Expectation</p>
                              <p className="font-bold text-slate-900">{format(new Date(req.return_by), 'PPPp')}</p>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 border shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Detailed Reason</p>
                            <p className="text-slate-700 italic leading-relaxed font-medium">"{req.reason}"</p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 px-1">
                              Guardian Message <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                              rows={3}
                              value={reasons[req.id] || ''}
                              onChange={(e) => setReasons(prev => ({ ...prev, [req.id]: e.target.value }))}
                              placeholder="E.g. Call us when you reach. Be safe!"
                              className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 border-slate-100 outline-none resize-none bg-white font-medium"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              onClick={() => handleDecide(req.id, 'rejected')}
                              disabled={isDeciding}
                              className="flex-1 h-14 rounded-2xl font-bold border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50 text-sm active:scale-[0.98]"
                            >
                              Reject Request
                            </button>
                            <button
                              onClick={() => handleDecide(req.id, 'approved')}
                              disabled={isDeciding}
                              className="flex-1 h-14 rounded-2xl font-bold bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center gap-3 text-sm active:scale-[0.98]"
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
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                Recent Decisions
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-2" />
                <span className="text-sm font-normal text-slate-400">Past {historyRequests.length} events</span>
              </h2>
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden divide-y divide-slate-100">
                {historyRequests.map((req) => {
                  const typeConfig = (REQUEST_TYPES as any)[req.request_type] || {
                    label: req.request_type.replace('_', ' '),
                    icon: 'AlertTriangle',
                    color: 'slate'
                  };
                  const statusConfig = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                  return (
                    <div key={req.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        typeConfig?.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        typeConfig?.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                        'bg-slate-100 text-slate-500'
                      )}>
                        <RequestIcon iconName={typeConfig?.icon || 'AlertTriangle'} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{typeConfig.label}</p>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
                          {format(new Date(req.departure_at), 'MMMM do')} • {req.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <span className={clsx('px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-sm', statusConfig.color)}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
                          {statusConfig.label}
                        </span>
                        <div className="hidden group-hover:block transition-all">
                          <ArrowRight className="w-4 h-4 text-slate-300" />
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
