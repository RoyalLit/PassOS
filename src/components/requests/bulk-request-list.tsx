'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, CheckSquare, Square, Check, X } from 'lucide-react';
import { RequestCard } from './request-card';
import { clsx } from 'clsx';
import type { PassRequest } from '@/types';

interface BulkRequestListProps {
  requests: PassRequest[];
  isAdminView?: boolean;
}

export function BulkRequestList({ requests, isAdminView = false }: BulkRequestListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const router = useRouter();

  // Only allow selection of pending requests
  const selectableRequests = requests.filter(r => 
    ['pending', 'admin_pending', 'parent_pending', 'parent_approved'].includes(r.status)
  );

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === selectableRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRequests.map(r => r.id)));
    }
  };

  const handleBulkAction = async (decision: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/approvals/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: Array.from(selectedIds),
          decision,
          reason: `Bulk ${decision} by ${isAdminView ? 'admin' : 'warden'}`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to process bulk ${decision}`);
      }

      toast.success(`Successfully ${decision} ${data.processed} requests`);
      setSelectedIds(new Set()); // Clear selection
      router.refresh();
      
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during bulk processing');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!requests?.length) {
    return (
      <div className="bg-card rounded-2xl border shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-foreground mb-2 text-xl tracking-tight">All caught up!</h3>
        <p className="text-muted-foreground">
          No requests found in the system right now.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pb-24">
      {selectableRequests.length > 0 && (
        <div className="flex justify-between items-center mb-4 px-2">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {selectedIds.size === selectableRequests.length ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            {selectedIds.size > 0 
              ? `Selected ${selectedIds.size} of ${selectableRequests.length}` 
              : 'Select All Pending'}
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {requests.map((request) => {
          const isSelectable = ['pending', 'admin_pending', 'parent_pending', 'parent_approved'].includes(request.status);
          const isSelected = selectedIds.has(request.id);

          return (
            <div 
              key={request.id} 
              className={clsx(
                "flex flex-row items-stretch gap-4 transition-all duration-200 rounded-2xl relative",
                isSelected && "ring-2 ring-blue-500 shadow-md transform scale-[1.01]"
              )}
            >
              {isSelectable && (
                <div 
                  className="shrink-0 flex items-start pt-6 cursor-pointer"
                  onClick={() => toggleSelection(request.id)}
                >
                  <div className="p-2 bg-card rounded-lg shadow-sm border border-border hover:bg-muted transition-colors">
                    {isSelected ? (
                      <CheckSquare className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Square className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
              
              <div 
                className={clsx(
                  "flex-1 min-w-0",
                  isSelectable && "cursor-pointer" 
                )}
                onClick={() => isSelectable && toggleSelection(request.id)}
              >
                <RequestCard 
                  request={request}
                  isAdminView={isAdminView}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-card/80 backdrop-blur-xl border border-border shadow-2xl rounded-full px-6 py-4 flex items-center gap-6">
            <span className="font-bold text-foreground">
              {selectedIds.size} selected
            </span>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex gap-3">
              <button
                onClick={() => handleBulkAction('rejected')}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-all font-bold text-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => handleBulkAction('approved')}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 font-bold text-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
