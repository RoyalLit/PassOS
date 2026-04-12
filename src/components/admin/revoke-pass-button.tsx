'use client';

import { useState } from 'react';
import { ShieldX, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RevokePassButtonProps {
  passId: string;
  studentName: string;
}

export function RevokePassButton({ passId, studentName }: RevokePassButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const router = useRouter();

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const res = await fetch('/api/admin/passes/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass_id: passId }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke pass');
      }
      
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to revoke pass');
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 flex items-center gap-2"
      >
        <ShieldX className="w-4 h-4" />
        Revoke Active Pass
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20">
          <ShieldX className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Revoke Pass</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Are you sure you want to revoke the active pass for <strong>{studentName}</strong>? This action cannot be undone and will immediately invalidate the pass.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsOpen(false)}
            disabled={isRevoking}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleRevoke}
            disabled={isRevoking}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/20 flex items-center justify-center gap-2"
          >
            {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Revoke'}
          </button>
        </div>
      </div>
    </div>
  );
}
