'use client';

import { useState, useEffect } from 'react';
import { 
  QrCode, 
  ShieldCheck, 
  XCircle, 
  Clock, 
  MapPin, 
  Camera,
  Maximize2,
  Scan,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function GuardDemoView() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success'>('idle');

  const startScan = () => {
    setScanState('scanning');
  };

  useEffect(() => {
    if (scanState === 'scanning') {
      const timer = setTimeout(() => {
        setScanState('success');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scanState]);

  return (
    <div className="max-w-xl mx-auto py-4 flex flex-col items-center">
      <div className="w-full text-center mb-8">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Security Scanner</h3>
        <p className="text-sm text-slate-500 font-medium">Verify guest and student passes instantly.</p>
      </div>

      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full aspect-square max-w-[320px] bg-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center p-8 relative overflow-hidden group border-4 border-slate-800"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-20 w-20 rounded-3xl bg-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Camera className="h-10 w-10 text-white" />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">Ready to Scan</h4>
              <p className="text-slate-400 text-xs text-center leading-relaxed mb-8">
                Align the QR code within the frame to verify mobility status.
              </p>
              <Button 
                onClick={startScan}
                className="bg-blue-600 hover:bg-blue-700 h-14 px-8 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/30"
              >
                Launch Scanner
              </Button>
            </div>
            {/* Scan Corners */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-white/20 rounded-tl-xl" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-white/20 rounded-tr-xl" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-white/20 rounded-bl-xl" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-white/20 rounded-br-xl" />
          </motion.div>
        )}

        {scanState === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full aspect-square max-w-[320px] bg-slate-950 rounded-[2.5rem] relative overflow-hidden flex items-center justify-center border-4 border-blue-500/50"
          >
            {/* Simulated Camera Feed */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,transparent_20%,black_100%)] z-10" />
            <div className="w-48 h-48 border-2 border-dashed border-blue-400/50 rounded-3xl flex items-center justify-center">
              <QrCode className="h-24 w-24 text-blue-500/30 animate-pulse" />
            </div>
            
            {/* Scanning Line */}
            <motion.div 
              initial={{ top: '10%' }}
              animate={{ top: '90%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="absolute left-4 right-4 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"
            />

            <div className="absolute bottom-8 left-0 right-0 text-center z-30">
              <p className="text-white text-[10px] uppercase font-bold tracking-[0.2em] animate-pulse">Scanning QR Code...</p>
            </div>
          </motion.div>
        )}

        {scanState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[400px] bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden"
          >
            <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <CheckCircle2 className="h-8 w-8 text-white font-bold" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-tight">Verified</h4>
                    <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Access Granted</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-none py-1 h-fit text-[10px] font-bold">PASS-9402</Badge>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <User size={32} className="text-slate-400" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-lg">Vikram Singh</h5>
                  <p className="text-xs text-slate-500 font-medium">Hostel B, Room 402 • 3rd Year</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pass Type</span>
                  <p className="text-sm font-bold text-slate-800">Day Outing</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <p className="text-sm font-bold text-emerald-600">Active</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination</span>
                  <p className="text-sm font-bold text-slate-800">Green City Park</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline</span>
                  <p className="text-sm font-bold text-slate-800">08:00 PM</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => setScanState('idle')}
                  className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all active:scale-95"
                >
                  Confirm Exit
                </Button>
                <Button 
                  onClick={() => setScanState('idle')}
                  variant="ghost"
                  className="w-full h-12 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold rounded-2xl border border-slate-200"
                >
                  Cancel Scan
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function User(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
