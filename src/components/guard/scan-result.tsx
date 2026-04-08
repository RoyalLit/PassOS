import { clsx } from 'clsx';
import { format } from 'date-fns';
import { CheckCircle, XCircle, User, Activity, LogOut } from 'lucide-react';
import type { ScanVerifyResult } from '@/types';

interface ScanResultViewProps {
  result: ScanVerifyResult;
  onClose: () => void;
}

export function ScanResultView({ result, onClose }: ScanResultViewProps) {
  const { valid, pass, student, message } = result;
  
  return (
    <div className="bg-card rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-border">
      <div className={clsx(
        "p-8 h-40 flex flex-col items-center justify-center text-white text-center relative overflow-hidden",
        valid ? "bg-green-600 shadow-[inset_0_0_80px_rgba(0,0,0,0.1)]" : "bg-red-600 shadow-[inset_0_0_80px_rgba(0,0,0,0.1)]"
      )}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {valid ? <CheckCircle className="w-48 h-48 -rotate-12 translate-x-12" /> : <XCircle className="w-48 h-48 -rotate-12 translate-x-12" />}
        </div>
        {valid ? <CheckCircle className="w-14 h-14 mb-3 relative z-10" /> : <XCircle className="w-14 h-14 mb-3 relative z-10" />}
        <h2 className="text-2xl font-black relative z-10 tracking-tight">{valid ? 'Access Granted' : 'Access Denied'}</h2>
      </div>

      <div className="p-6 relative">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-card rounded-full border-4 border-card shadow-2xl flex items-center justify-center overflow-hidden">
          {student?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.avatar_url} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="pt-12 text-center">
          <h3 className="text-2xl font-black text-foreground tracking-tight">{student?.full_name || 'Unknown User'}</h3>
          <p className="text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-widest leading-none">{valid ? message : 'Invalid Pass System Error'}</p>
          
          {!valid && (
            <div className="mt-4 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold inline-block shadow-sm">
              {message}
            </div>
          )}

          {valid && pass && (
            <div className="mt-8 grid grid-cols-2 gap-4 text-left">
              <div className="bg-muted/30 p-4 rounded-2xl border border-border shadow-sm">
                <p className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5" /> Expiry
                </p>
                <p className="font-bold text-foreground text-sm">{format(new Date(pass.valid_until), 'HH:mm - MMM d')}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border shadow-sm">
                <p className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> State
                </p>
                <p className="font-bold text-foreground text-sm capitalize flex items-center gap-2">
                  <span className={clsx("w-2 h-2 rounded-full", pass.status === 'used_exit' ? 'bg-blue-500' : 'bg-green-500')} />
                  {pass.status === 'used_exit' ? 'Returning' : 'Exiting'}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-10 py-4 bg-foreground text-background font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-foreground/10 hover:opacity-90 active:scale-95"
        >
          Scan Next Pass
        </button>
      </div>
    </div>
  );
}
