'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Check, X, Loader2, Bot, User, Clock, FileWarning } from 'lucide-react';
import { RiskBadge } from './risk-badge';
import type { PassRequest, AIAnalysis, Profile, Approval } from '@/types';
import { REQUEST_TYPES } from '@/lib/constants';
import { RequestIcon } from '@/components/requests/request-icon';
import { clsx } from 'clsx';

interface ExtendedRequest extends PassRequest {
  student: Profile;
  ai_analysis?: AIAnalysis[];
  approvals?: Approval[];
}

export function ApprovalPanel({ request }: { request: ExtendedRequest }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const aiResult = request.ai_analysis?.[0];
  const parentApproval = request.approvals?.find(a => a.approver_type === 'parent');
  const typeConfig = REQUEST_TYPES[request.request_type as keyof typeof REQUEST_TYPES];

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          decision,
          reason
        }),
      });
      if (!res.ok) throw new Error('Failed to submit approval');
      router.refresh();
    } catch (error) {
      alert(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b bg-slate-50 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            typeConfig?.color === 'blue' ? 'bg-blue-100 text-blue-700' :
            typeConfig?.color === 'purple' ? 'bg-purple-100 text-purple-700' :
            'bg-slate-100 text-slate-500'
          )}>
            <RequestIcon iconName={typeConfig?.icon || 'AlertCircle'} className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">{request.student?.full_name}</h3>
            <p className={clsx("text-xs font-semibold uppercase tracking-wider mt-0.5", 
              typeConfig?.color === 'blue' ? 'text-blue-600' :
              typeConfig?.color === 'purple' ? 'text-purple-600' :
              'text-slate-500'
            )}>
              {typeConfig?.label || request.request_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">{format(new Date(request.created_at), 'MMM d, HH:mm')}</p>
        </div>
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* Core details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-3 border">
            <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1 text-[10px] uppercase">
              <Clock className="w-3 h-3" /> Departure
            </p>
            <p className="text-sm font-semibold">{format(new Date(request.departure_at), 'MMM d, HH:mm')}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border">
            <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1 text-[10px] uppercase">
              <Clock className="w-3 h-3" /> Return By
            </p>
            <p className="text-sm font-semibold">{format(new Date(request.return_by), 'MMM d, HH:mm')}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Destination</p>
          <p className="text-slate-900 font-medium">{request.destination}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reason</p>
          <div className="text-slate-700 bg-slate-50 border p-3 rounded-lg flex items-start gap-2">
            <span className="text-slate-300 text-lg leading-none">"</span>
            <p className="italic text-sm leading-relaxed">{request.reason}</p>
            <span className="text-slate-300 text-lg leading-none self-end">"</span>
          </div>
        </div>

        {/* AI & Parent Signals */}
        <div className="space-y-3 pt-2">
          {aiResult && (
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50/50 border-blue-100">
              <Bot className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-900">AI Risk Analysis</p>
                  <RiskBadge level={aiResult.risk_level} score={aiResult.anomaly_score} />
                </div>
                <p className="text-xs text-slate-600 leading-normal">{aiResult.reasoning}</p>
                {aiResult.flags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {aiResult.flags.map((flag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                        <FileWarning className="w-3 h-3" /> {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {parentApproval && (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${
              parentApproval.decision === 'approved' ? 'bg-green-50/50 border-green-100' :
              parentApproval.decision === 'rejected' ? 'bg-red-50/50 border-red-100' :
              'bg-amber-50/50 border-amber-100'
            }`}>
              <User className="w-5 h-5 text-slate-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">Parent Decision</p>
                <p className="text-xs font-bold mt-0.5 flex items-center gap-1 uppercase tracking-wider">
                  {parentApproval.decision === 'approved' ? <span className="text-green-600">Approved</span> :
                   parentApproval.decision === 'rejected' ? <span className="text-red-600">Rejected</span> :
                   <span className="text-amber-600">Pending</span>}
                </p>
                {parentApproval.reason && (
                  <p className="text-xs text-slate-600 mt-1 italic leading-relaxed">"{parentApproval.reason}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {['pending', 'ai_review', 'admin_pending', 'parent_pending'].includes(request.status) && (
        <div className="p-5 border-t bg-slate-50 space-y-3">
          <input
            type="text"
            placeholder="Optional admin note..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleDecision('rejected')}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-white border-2 border-red-200 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
            >
              <X className="w-4 h-4" /> REJECT
            </button>
            <button
              onClick={() => handleDecision('approved')}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-bold text-sm rounded-lg hover:bg-green-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              APPROVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
