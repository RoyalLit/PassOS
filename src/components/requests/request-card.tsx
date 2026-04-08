'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PassRequest, Profile } from '@/types';

interface RequestCardProps {
  request: PassRequest & { student?: Profile };
  isAdminView?: boolean;
}

export function RequestCard({ request, isAdminView = false }: RequestCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);
  
  const isPending = ['pending', 'parent_pending', 'admin_pending'].includes(request.status);
  
  const handleApproval = async (decision: 'approved' | 'rejected') => {
    setLoading(decision);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          decision,
          reason: decision === 'rejected' ? 'Rejected by administrator' : 'Approved by administrator'
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to submit decision');
      }
      
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          {isAdminView && request.student && (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center overflow-hidden border border-border">
                {request.student.avatar_url ? (
                  <img src={request.student.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-blue-600">{request.student.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                  {request.student.full_name} 
                </h3>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded">
                  {request.student.hostel} • {request.student.room_number}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-muted text-foreground/70 text-[10px] font-black rounded-full uppercase tracking-tighter border border-border">
              {request.request_type.replace('_', ' ')}
            </span>
            <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter border ${
              request.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
              request.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              'bg-blue-500/10 text-blue-500 border-blue-500/20'
            }`}>
              {request.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <p className="text-foreground/80 mb-6 font-medium leading-relaxed italic border-l-4 border-blue-500/30 pl-4 py-1 bg-muted/20 rounded-r-xl">&ldquo;{String(request.reason)}&rdquo;</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-muted-foreground mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="tracking-tight">{request.destination}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="tracking-tight">{format(new Date(request.departure_at), 'MMM d, h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="tracking-tight">Return by: {format(new Date(request.return_by), 'MMM d, h:mm a')}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {isAdminView && isPending ? (
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => handleApproval('rejected')}
              disabled={loading !== null}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/10 text-sm font-bold transition-all disabled:opacity-50 active:scale-95"
            >
              {loading === 'rejected' && <Loader2 className="w-4 h-4 animate-spin" />}
              Reject
            </button>
            <button 
              onClick={() => handleApproval('approved')}
              disabled={loading !== null}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-95"
            >
              {loading === 'approved' && <Loader2 className="w-4 h-4 animate-spin" />}
              Approve Request
            </button>
          </div>
        ) : !isAdminView && request.status === 'approved' ? (
          <Link href={`/student/pass/${request.id}`} className="w-full sm:w-auto text-center px-6 py-2.5 bg-foreground text-background rounded-xl hover:opacity-90 text-sm font-bold transition-all shadow-xl shadow-foreground/10 active:scale-95">
            View Live Pass
          </Link>
        ) : null}
      </div>
    </div>
  );
}
