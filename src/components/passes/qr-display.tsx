'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { QrCode, Shield, Clock } from 'lucide-react';
import type { Pass } from '@/types';

export function QRDisplay({ pass }: { pass: Pass }) {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (pass.qr_payload) {
      QRCode.toDataURL(pass.qr_payload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrSrc).catch(console.error);
    }
  }, [pass.qr_payload]);

  const isValid = pass.status === 'active' && new Date() < new Date(pass.valid_until);

  return (
    <div className="bg-card rounded-3xl shadow-xl border border-border overflow-hidden max-w-sm mx-auto transition-all animate-in zoom-in-95 duration-300">
      <div className={`p-8 text-center text-white ${isValid ? 'bg-blue-600' : 'bg-slate-600'} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <QrCode className="w-48 h-48 -rotate-12 translate-x-12 -translate-y-6" />
        </div>
        <Shield className="w-14 h-14 mx-auto mb-4 relative z-10" />
        <h2 className="text-2xl font-black tracking-tight relative z-10">Active Gate Pass</h2>
        <p className="mt-2 font-black bg-black/20 backdrop-blur-sm inline-block px-4 py-1.5 rounded-full text-xs tracking-widest uppercase relative z-10 border border-white/10">
          ID: {pass.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <div className="p-8 pb-10 flex flex-col items-center">
        <div className="bg-white p-3 rounded-2xl shadow-2xl border-4 border-card">
          {qrSrc ? (
            <img src={qrSrc} alt="Pass QR Code" className="w-[220px] h-[220px]" />
          ) : (
            <div className="w-[220px] h-[220px] bg-muted animate-pulse rounded-xl flex items-center justify-center">
              <QrCode className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="mt-10 w-full space-y-4">
          <div className="flex items-start gap-3 bg-muted/30 p-5 rounded-2xl border border-border shadow-sm">
            <Clock className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <div className="flex justify-between mb-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valid From</span>
                <span className="font-bold text-foreground">{format(new Date(pass.valid_from), 'MMM d, HH:mm')}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valid Until</span>
                <span className="font-bold text-foreground">{format(new Date(pass.valid_until), 'MMM d, HH:mm')}</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs font-bold text-muted-foreground">Scan at gate scanner</p>
            <p className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-widest font-black">Private Security Code</p>
          </div>
        </div>
      </div>
    </div>
  );
}
