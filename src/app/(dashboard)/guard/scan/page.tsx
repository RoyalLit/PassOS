'use client';

import { useState } from 'react';
import { QRScanner } from '@/components/guard/qr-scanner';
import { ScanResultView } from '@/components/guard/scan-result';
import type { ScanVerifyResult } from '@/types';

export default function GuardScanPage() {
  const [scanType, setScanType] = useState<'exit' | 'entry'>('exit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanVerifyResult | null>(null);

  const handleScan = async (decodedText: string) => {
    setIsProcessing(true);
    
    try {
      // Get location for the log if possible, but don't strictly enforce guard location in this MVP
      let geo = { lat: 0, lng: 0 };
      if (navigator.geolocation) {
         await new Promise<void>((resolve) => {
           navigator.geolocation.getCurrentPosition(
             (pos) => {
               geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
               resolve();
             },
             () => resolve(), // ignore if denied/timeout
             { timeout: 2000 }
           );
         });
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_payload: decodedText,
          scan_type: scanType,
          geo_lat: geo.lat,
          geo_lng: geo.lng,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        valid: false,
        result: 'error',
        message: 'Network error communicating with server',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto min-h-[calc(100vh-64px)] flex flex-col pt-12 md:pt-20">
      
      {!result && (
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-6">Scanner Mode</h1>
          
          <div className="flex bg-muted p-1 rounded-xl w-full max-w-xs mx-auto relative z-10 border border-border shadow-sm">
            <button
              onClick={() => setScanType('exit')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${
                scanType === 'exit' ? 'bg-card shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Exit Campus
            </button>
            <button
              onClick={() => setScanType('entry')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${
                scanType === 'entry' ? 'bg-card shadow-sm text-green-600' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Enter Campus
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center">
        {result ? (
          <div className="w-full">
            <ScanResultView result={result} onClose={handleReset} />
          </div>
        ) : (
          <div className="w-full">
            <QRScanner onScan={handleScan} isProcessing={isProcessing} />
          </div>
        )}
      </div>
    </div>
  );
}
