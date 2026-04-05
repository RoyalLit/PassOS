import { clsx } from 'clsx';
import { format } from 'date-fns';
import { CheckCircle, XCircle, User, Activity, LogIn, LogOut } from 'lucide-react';
import type { ScanVerifyResult } from '@/types';

interface ScanResultViewProps {
  result: ScanVerifyResult;
  onClose: () => void;
}

export function ScanResultView({ result, onClose }: ScanResultViewProps) {
  const { valid, pass, student, message } = result;
  
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 border">
      <div className={clsx(
        "p-6 h-32 flex flex-col items-center justify-center text-white text-center",
        valid ? "bg-green-600" : "bg-red-600"
      )}>
        {valid ? <CheckCircle className="w-12 h-12 mb-2" /> : <XCircle className="w-12 h-12 mb-2" />}
        <h2 className="text-xl font-bold">{valid ? 'Access Granted' : 'Access Denied'}</h2>
      </div>

      <div className="p-6 relative">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
          {student?.avatar_url ? (
            <img src={student.avatar_url} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-slate-400" />
          )}
        </div>

        <div className="pt-12 text-center">
          <h3 className="text-xl font-bold text-slate-900">{student?.full_name || 'Unknown User'}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">{valid ? message : 'Invalid Pass'}</p>
          
          {!valid && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium inline-block">
              {message}
            </div>
          )}

          {valid && pass && (
            <div className="mt-6 flex gap-4 text-left">
              <div className="flex-1 bg-slate-50 p-4 rounded-2xl border">
                <p className="text-xs text-slate-500 uppercase font-medium mb-1 flex items-center gap-1">
                  <LogOut className="w-3 h-3" /> Expiry
                </p>
                <p className="font-semibold text-slate-900">{format(new Date(pass.valid_until), 'HH:mm - MMM d')}</p>
              </div>
              <div className="flex-1 bg-slate-50 p-4 rounded-2xl border">
                <p className="text-xs text-slate-500 uppercase font-medium mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> State
                </p>
                <p className="font-semibold text-slate-900 capitalize flex items-center gap-1.5">
                  <span className={clsx("w-2 h-2 rounded-full", pass.status === 'used_exit' ? 'bg-blue-500' : 'bg-green-500')} />
                  {pass.status === 'used_exit' ? 'Returning' : 'Exiting'}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-xl transition-colors"
        >
          Scan Next Pass
        </button>
      </div>
    </div>
  );
}
