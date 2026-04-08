'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { User, ShieldAlert, X, ChevronRight, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { FraudFlag } from '@/types';
import { clsx } from 'clsx';

interface FraudTableProps {
  flags: FraudFlag[];
}

export function FraudTable({ flags }: FraudTableProps) {
  const [selectedFlag, setSelectedFlag] = useState<FraudFlag | null>(null);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleResolve = async (id: string) => {
    setResolvingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/fraud/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });
      if (!res.ok) throw new Error('Failed to resolve flag');
      toast.success('Flag resolved');
      // In a real app, we'd router.refresh() or update state
      // For now we'll just simulate it or wait for refresh
      window.location.reload(); 
    } catch (err) {
      toast.error('Failed to resolve');
    } finally {
      setResolvingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkResolve = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(`/api/admin/fraud/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('Failed to resolve flags');
      toast.success(`${selectedIds.size} flags resolved`);
      window.location.reload();
    } catch (err) {
      toast.error('Bulk resolve failed');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl"
          >
            <span className="text-sm font-bold">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-white/20" />
            <button 
              onClick={handleBulkResolve}
              className="text-sm font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
            >
              Resolve All
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/10 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === flags.length && flags.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(flags.map(f => f.id)));
                    else setSelectedIds(new Set());
                  }}
                  className="rounded border-border bg-background"
                />
              </th>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Flag Details</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {flags.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No fraud flags detected.</p>
                </td>
              </tr>
            ) : (
              flags.map((flag) => (
                <tr 
                  key={flag.id} 
                  className={clsx(
                    "group transition-colors cursor-pointer",
                    flag.resolved ? 'opacity-50 bg-muted/5' : 'hover:bg-muted/30',
                    selectedFlag?.id === flag.id && "bg-blue-500/5 ring-1 ring-inset ring-blue-500/20"
                  )}
                  onClick={() => setSelectedFlag(flag)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(flag.id)}
                      onChange={() => toggleSelect(flag.id)}
                      className="rounded border-border bg-background"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{flag.student?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{flag.student?.hostel || 'No Hostel'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-muted text-foreground/70 border border-border">
                        {flag.flag_type.replace('_', ' ')}
                      </span>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {JSON.stringify(flag.details).replace(/["{}]/g, '')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                      flag.severity === 'critical' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                      flag.severity === 'high' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    )}>
                      {flag.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    {format(new Date(flag.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {!flag.resolved ? (
                      <button 
                        onClick={() => handleResolve(flag.id)}
                        disabled={resolvingIds.has(flag.id)}
                        className="p-2 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-500/5 group/btn"
                      >
                        {resolvingIds.has(flag.id) ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Detail Panel */}
      <AnimatePresence>
        {selectedFlag && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFlag(null)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-card/90 backdrop-blur-xl border-l border-border z-[70] shadow-2xl overflow-y-auto"
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Flag Details</h2>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">System Alert</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedFlag(null)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-muted/30 rounded-3xl p-6 border border-border">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-xl font-bold font-mono">
                      {selectedFlag.student?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{selectedFlag.student?.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedFlag.student?.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/50 rounded-2xl p-3 border border-border/50">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hostel</p>
                      <p className="text-xs font-bold">{selectedFlag.student?.hostel || 'N/A'}</p>
                    </div>
                    <div className="bg-background/50 rounded-2xl p-3 border border-border/50">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Room</p>
                      <p className="text-xs font-bold">{selectedFlag.student?.room_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Detection Context</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-foreground/70">Alert Type</span>
                      <span className="text-sm font-bold capitalize">{selectedFlag.flag_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-foreground/70">Timestamp</span>
                      <span className="text-sm font-bold">{format(new Date(selectedFlag.created_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-foreground/70">Severity</span>
                      <span className={clsx(
                        "text-xs font-black uppercase px-2 py-0.5 rounded border",
                        selectedFlag.severity === 'critical' ? 'text-red-500 border-red-500/20' : 'text-amber-500 border-amber-500/20'
                      )}>{selectedFlag.severity}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Detailed Payload</h4>
                  <div className="bg-slate-950 rounded-2xl p-5 border border-slate-900 overflow-x-auto">
                    <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                      {JSON.stringify(selectedFlag.details, null, 2)}
                    </pre>
                  </div>
                </div>

                {!selectedFlag.resolved && (
                  <button 
                    onClick={() => {
                      handleResolve(selectedFlag.id);
                      setSelectedFlag(null);
                    }}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    Mark as Resolved
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
