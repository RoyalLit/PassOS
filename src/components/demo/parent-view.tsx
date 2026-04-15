'use client';

import { useState } from 'react';
import { 
  Check, 
  X, 
  MapPin, 
  Clock, 
  User, 
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ParentDemoView() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Gate Pass Requests</h3>
        <p className="text-sm text-slate-500 font-medium">Review pending requests from your student.</p>
      </div>

      <AnimatePresence mode="wait">
        {status === 'pending' ? (
          <motion.div
            key="request"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden"
          >
            <div className="bg-blue-600 p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold tracking-tight">Aryan Sharma</h4>
                  <p className="text-blue-100 text-sm font-medium">Computer Science, Year 2</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
                ID: CS2024-8842
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Destination</span>
                  </div>
                  <p className="font-bold text-slate-800">Downtown Mall</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Return Time</span>
                  </div>
                  <p className="font-bold text-slate-800">9:30 PM Tonight</p>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Reason</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                    "Meeting friends for dinner and catching a movie. Will be back by 9:30 PM."
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => setStatus('rejected')}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                >
                  <X className="mr-2 h-5 w-5" /> Reject
                </Button>
                <Button 
                  onClick={() => setStatus('approved')}
                  className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20"
                >
                  <Check className="mr-2 h-5 w-5" /> Approve
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="response"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-12 rounded-[2.5rem] text-center border",
              status === 'approved' 
                ? "bg-emerald-50/50 border-emerald-100" 
                : "bg-red-50/50 border-red-100"
            )}
          >
            <div className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6",
              status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
            )}>
              {status === 'approved' ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
            </div>
            <h3 className={cn(
              "text-2xl font-bold mb-2",
              status === 'approved' ? "text-emerald-900" : "text-red-900"
            )}>
              {status === 'approved' ? 'Request Approved' : 'Request Rejected'}
            </h3>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed font-medium">
              {status === 'approved' 
                ? 'Your decision has been sent. Aryan can now proceed to the gate.' 
                : 'Your decision has been sent. The student will be notified of the rejection.'}
            </p>
            <Button 
              onClick={() => setStatus('pending')}
              variant="ghost"
              className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold border border-slate-200 px-6 py-2 rounded-xl"
            >
              Reset Demo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
