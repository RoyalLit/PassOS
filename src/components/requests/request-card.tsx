'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function RequestCard({ request, isAdminView = false }: { request: any, isAdminView?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);
  
  const isPending = ['pending', 'ai_review', 'parent_pending', 'admin_pending'].includes(request.status);
  
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
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          {isAdminView && request.student && (
            <h3 className="font-semibold text-lg text-slate-900 mb-1">
              {request.student.full_name} 
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({request.student.hostel} - {request.student.room_number})
              </span>
            </h3>
          )}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full capitalize">
              {request.request_type.replace('_', ' ')}
            </span>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              request.status === 'approved' ? 'bg-green-100 text-green-700' :
              request.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {request.status.replace('_', ' ')}
            </span>
            {isAdminView && request.ai_analysis?.[0] && (
              <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                request.ai_analysis[0].risk_level === 'low' ? 'bg-green-50 text-green-700 border border-green-200' :
                request.ai_analysis[0].risk_level === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <ShieldAlert className="w-3 h-3" />
                {request.ai_analysis[0].risk_level} risk
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-slate-700 mb-4">{request.reason}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600 mb-5 pb-5 border-b">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{request.destination}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(request.departure_at), 'MMM d, h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Return by: {format(new Date(request.return_by), 'MMM d, h:mm a')}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {isAdminView && isPending ? (
          <div className="flex gap-2">
            <button 
              onClick={() => handleApproval('rejected')}
              disabled={loading !== null}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === 'rejected' && <Loader2 className="w-4 h-4 animate-spin" />}
              Reject
            </button>
            <button 
              onClick={() => handleApproval('approved')}
              disabled={loading !== null}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === 'approved' && <Loader2 className="w-4 h-4 animate-spin" />}
              Approve Request
            </button>
          </div>
        ) : !isAdminView && request.status === 'approved' ? (
          <Link href={`/student/pass/${request.id}`} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors">
            View Live Pass
          </Link>
        ) : null}
      </div>
    </div>
  );
}
