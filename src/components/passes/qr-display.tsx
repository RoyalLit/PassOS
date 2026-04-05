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
    <div className="bg-white rounded-3xl shadow-lg border overflow-hidden max-w-sm mx-auto">
      <div className={`p-6 text-center text-white ${isValid ? 'bg-blue-600' : 'bg-slate-600'}`}>
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-90" />
        <h2 className="text-2xl font-bold tracking-tight">Active Gate Pass</h2>
        <p className="text-blue-100 mt-1 font-medium bg-blue-700/50 inline-block px-3 py-1 rounded-full text-sm">
          {pass.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <div className="p-8 pb-10 flex flex-col items-center">
        <div className="bg-white p-2 rounded-2xl shadow-sm border">
          {qrSrc ? (
            <img src={qrSrc} alt="Pass QR Code" className="w-[200px] h-[200px]" />
          ) : (
            <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-xl flex items-center justify-center">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
          )}
        </div>

        <div className="mt-8 w-full space-y-4">
          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border">
            <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 font-medium tracking-wide">VALID FROM</span>
                <span className="font-bold text-slate-900">{format(new Date(pass.valid_from), 'MMM d, HH:mm')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium tracking-wide">VALID UNTIL</span>
                <span className="font-bold text-slate-900">{format(new Date(pass.valid_until), 'MMM d, HH:mm')}</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">Scan this code at the campus gate scanner.</p>
            <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest font-mono">Do not share this code</p>
          </div>
        </div>
      </div>
    </div>
  );
}
