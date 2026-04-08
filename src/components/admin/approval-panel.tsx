'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Check, X, Loader2, User, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { PassRequest, Profile, Approval } from '@/types';
import { REQUEST_TYPES } from '@/lib/constants';
import { RequestIcon } from '@/components/requests/request-icon';
import { clsx } from 'clsx';

interface ExtendedRequest extends PassRequest {
  student: Profile;
  approvals?: Approval[];
}

export function ApprovalPanel({ request }: { request: ExtendedRequest }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');

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
      toast.success(decision === 'approved' ? 'Request approved successfully!' : 'Request rejected.');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred processing the approval';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow"
    >
      <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
            typeConfig?.color === 'blue' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
            typeConfig?.color === 'purple' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
            'bg-muted text-muted-foreground'
          )}>
            <RequestIcon iconName={typeConfig?.icon || 'AlertCircle'} className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight tracking-tight">{request.student?.full_name}</h3>
            <p className={clsx("text-[10px] font-black uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded border inline-block", 
              typeConfig?.color === 'blue' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
              typeConfig?.color === 'purple' ? 'text-purple-500 border-purple-500/20 bg-purple-500/5' :
              'text-muted-foreground border-border bg-muted/50'
            )}>
              {typeConfig?.label || request.request_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Created</p>
          <p className="text-xs font-bold text-foreground mt-0.5">{format(new Date(request.created_at), 'MMM d, HH:mm')}</p>
        </div>
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* Core details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-xl p-3 border border-border">
            <p className="text-muted-foreground/60 font-black mb-1.5 flex items-center gap-1 text-[9px] uppercase tracking-widest">
              <Clock className="w-3 h-3" /> Departure
            </p>
            <p className="text-sm font-bold text-foreground">{format(new Date(request.departure_at), 'MMM d, HH:mm')}</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 border border-border">
            <p className="text-muted-foreground/60 font-black mb-1.5 flex items-center gap-1 text-[9px] uppercase tracking-widest">
              <Clock className="w-3 h-3" /> Return By
            </p>
            <p className="text-sm font-bold text-foreground">{format(new Date(request.return_by), 'MMM d, HH:mm')}</p>
          </div>
        </div>

        <div>
          <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1.5">Destination</p>
          <p className="text-foreground font-bold text-lg tracking-tight">{request.destination}</p>
        </div>

        <div>
          <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1.5">Reason</p>
          <div className="text-foreground/90 bg-muted/20 border border-border p-4 rounded-xl flex items-start gap-3 relative shadow-sm">
            <span className="text-muted-foreground/20 text-4xl leading-none absolute -top-1 left-1 pointer-events-none">&ldquo;</span>
            <p className="italic text-sm leading-relaxed font-medium relative z-10 pl-2 pr-2">{request.reason}</p>
            <span className="text-muted-foreground/20 text-4xl leading-none absolute -bottom-3 right-1 pointer-events-none">&rdquo;</span>
          </div>
        </div>

        {/* Parent Signal */}
        <div className="space-y-3 pt-2">

          {parentApproval && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-sm ${
              parentApproval.decision === 'approved' ? 'bg-green-500/5 border-green-500/20' :
              parentApproval.decision === 'rejected' ? 'bg-red-500/5 border-red-500/20' :
              'bg-amber-500/5 border-amber-500/20'
            }`}>
              <User className={clsx("w-5 h-5 mt-0.5 shrink-0", 
                parentApproval.decision === 'approved' ? 'text-green-500' :
                parentApproval.decision === 'rejected' ? 'text-red-500' :
                'text-amber-500'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">Parental Decision</p>
                <p className="text-[10px] font-black mt-1 flex items-center gap-1 uppercase tracking-widest group">
                  {parentApproval.decision === 'approved' ? <span className="text-green-500">Approved Link</span> :
                   parentApproval.decision === 'rejected' ? <span className="text-red-500">Access Denied</span> :
                   <span className="text-amber-500">Awaiting Response</span>}
                </p>
                {parentApproval.reason && (
                  <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed border-l-2 border-current/10 pl-2">&ldquo;{parentApproval.reason}&rdquo;</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {['pending', 'admin_pending', 'parent_pending'].includes(request.status) && (
        <div className="p-5 border-t border-border bg-muted/30 space-y-3">
          <input
            type="text"
            placeholder="Optional admin note..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full text-sm border-2 border-border rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 bg-background font-bold text-foreground placeholder:text-muted-foreground/40 transition-all shadow-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleDecision('rejected')}
              disabled={submitting}
              className="flex-1 h-12 bg-card border-2 border-red-500/20 text-red-500 font-black text-[10px] tracking-widest rounded-xl hover:bg-red-500/10 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <X className="w-4 h-4" /> REJECT
            </button>
            <button
              onClick={() => handleDecision('approved')}
              disabled={submitting}
              className="flex-1 h-12 bg-green-600 text-white font-black text-[10px] tracking-widest rounded-xl hover:bg-green-700 transition-all flex justify-center items-center gap-2 shadow-xl shadow-green-500/10 active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              APPROVE
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
