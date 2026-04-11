'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface RequestActionsProps {
  requestId: string;
  currentStatus: string;
  approverType: 'parent' | 'admin' | 'warden';
  studentId: string;
}

export function RequestActions({
  requestId,
  currentStatus,
  approverType,
  studentId,
}: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const canApprove = currentStatus === 'pending' || currentStatus === 'admin_pending';
  const canReject = canApprove;

  const handleApprove = async () => {
    setLoading('approve');
    try {
      // For warden, we add an approval record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create approval record
      const { error: approvalError } = await supabase
        .from('approvals')
        .insert({
          request_id: requestId,
          approver_id: user.id,
          approver_type: approverType,
          decision: 'approved',
        });

      if (approvalError) throw approvalError;

      // Update request status to move to next approver
      let newStatus = 'admin_pending';
      if (currentStatus === 'admin_pending') {
        newStatus = 'approved';
      }

      const { error: updateError } = await supabase
        .from('pass_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved by admin (final step), generate the pass
      if (newStatus === 'approved') {
        await fetch('/api/passes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId }),
        });
      }

      toast.success('Request approved successfully');
      router.refresh();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve request');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create rejection record
      const { error: approvalError } = await supabase
        .from('approvals')
        .insert({
          request_id: requestId,
          approver_id: user.id,
          approver_type: approverType,
          decision: 'rejected',
        });

      if (approvalError) throw approvalError;

      // Update request status
      const { error: updateError } = await supabase
        .from('pass_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast.success('Request rejected');
      router.refresh();
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject request');
    } finally {
      setLoading(null);
    }
  };

  if (!canApprove && !canReject) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 text-center">
        <p className="text-sm text-muted-foreground">
          {currentStatus === 'parent_pending' 
            ? 'Awaiting parent approval' 
            : currentStatus === 'parent_approved'
              ? 'Parent approved, awaiting admin'
              : 'No action available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 active:scale-[0.98]"
      >
        {loading === 'approve' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )}
        Approve
      </button>
      
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 active:scale-[0.98]"
      >
        {loading === 'reject' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <XCircle className="w-5 h-5" />
        )}
        Reject
      </button>
    </div>
  );
}
