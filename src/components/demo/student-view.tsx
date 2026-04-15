'use client';

import { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Calendar, 
  ChevronRight, 
  CheckCircle2,
  Clock3,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function StudentDemoView() {
  const [step, setStep] = useState<'list' | 'form' | 'success'>('list');

  const mockExistingRequests = [
    {
      id: 'REQ-123',
      type: 'Day Outing',
      destination: 'Downtown Market',
      status: 'Awaiting Parent',
      date: 'Today',
      time: '4:00 PM - 8:00 PM'
    }
  ];

  return (
    <div className="max-w-xl mx-auto py-4">
      <AnimatePresence mode="wait">
        {step === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-4 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
              <div>
                <h3 className="font-bold text-blue-900">Need to go out?</h3>
                <p className="text-sm text-blue-700/70">Request a gate pass in seconds.</p>
              </div>
              <Button 
                onClick={() => setStep('form')}
                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-2xl shadow-lg shadow-blue-500/20"
              >
                <Plus className="mr-2 h-4 w-4" /> New Request
              </Button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mb-4">Active Requests</h4>
              <div className="space-y-3">
                {mockExistingRequests.map((req) => (
                  <div key={req.id} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors group cursor-default">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <Clock3 className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800">{req.id}</span>
                        <Badge className="!bg-amber-100 !text-amber-700 border-none px-2 py-0 h-5 text-[10px] font-bold">
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {req.destination} • {req.time}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Banner */}
            <div className="p-5 bg-slate-900 rounded-3xl text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Portal Info</span>
                </div>
                <h4 className="font-bold text-sm mb-1">Ready for the weekend?</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">Plan your overnight visits early for faster approvals.</p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <header className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('list')}
                className="rounded-xl hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h3 className="font-bold text-xl">New Day Outing</h3>
            </header>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">DESTINATION</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Where are you going?" 
                    className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">DATE</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input 
                      type="text" 
                      value="Mar 24, 2026" 
                      readOnly
                      className="w-full h-14 bg-slate-100 border border-slate-200 rounded-2xl pl-12 pr-4 text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">RETURN TIME</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input 
                      type="text" 
                      value="9:00 PM" 
                      readOnly
                      className="w-full h-14 bg-slate-100 border border-slate-200 rounded-2xl pl-12 pr-4 text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button 
                  onClick={() => setStep('success')}
                  className="w-full h-16 rounded-2xl bg-blue-600 text-white text-lg font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1 active:scale-95"
                >
                  Submit Request
                </Button>
                <p className="text-center text-[10px] text-slate-400 font-medium tracking-tight">
                  This request will be sent to your Parent for approval.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-10"
          >
            <div className="h-24 w-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h3>
            <p className="text-slate-500 max-w-[280px] mb-8 leading-relaxed">
              We've notified your parent. You'll get an alert when they respond.
            </p>
            <Button 
              onClick={() => setStep('list')}
              variant="outline"
              className="h-12 rounded-2xl px-8 font-bold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Back to Dashboard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
