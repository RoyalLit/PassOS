'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CancelRequestButtonProps {
  requestId: string;
}

export function CancelRequestButton({ requestId }: CancelRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/cancel`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel request');
      }

      toast.success('Request cancelled successfully');
      router.refresh();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'An error occurred while cancelling';
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isLoading}
      className="inline-flex items-center justify-center p-2 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Cancel Request"
      aria-label="Cancel Request"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <X className="w-4 h-4" />
      )}
    </button>
  );
}
