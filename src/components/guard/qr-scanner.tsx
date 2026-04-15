'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, Camera, ShieldAlert } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isProcessing: boolean;
}

export function QRScanner({ onScan, isProcessing }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const isProcessingRef = useRef(isProcessing);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
    onScanRef.current = onScan;
  }, [isProcessing, onScan]);

  useEffect(() => {
    let active = true;

    async function initScanner() {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (active && !isProcessingRef.current) {
              // Vibrate on successful scan if supported
              if (navigator.vibrate) navigator.vibrate(100);
              onScanRef.current(decodedText);
            }
          },
          () => {} // ignore errors (usually just means no QR found in frame)
        );
        
        if (active) setHasPermission(true);
      } catch (err) {
        console.error('Scanner init error:', err);
        if (active) setHasPermission(false);
      }
    }

    initScanner();

    return () => {
      active = false;
      if (scannerRef.current?.isScanning) {
        // Run asynchronously to avoid React unmount race conditions
        setTimeout(() => {
          try {
            scannerRef.current?.stop().catch(() => {});
          } catch { /* ignore cleanup errors */ }
        }, 100);
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-black border-4 border-slate-900 shadow-2xl">
      <div id="qr-reader" className="w-full h-full min-h-[350px]"></div>

      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <Camera className="w-12 h-12 mb-4 text-slate-500" />
          <h3 className="font-bold text-lg mb-1">Camera Access Denied</h3>
          <p className="text-sm text-slate-400">Please allow camera access in your browser settings to scan passes.</p>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50 transition-all duration-300">
        {/* Scanning Box Reticle */}
        <div className="w-full h-full relative shadow-[0_0_40px_rgba(59,130,246,0.2)] rounded-xl overflow-hidden">
          
          {/* Corner Brackets */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-[5px] border-l-[5px] border-blue-500 rounded-tl-xl drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-[5px] border-r-[5px] border-blue-500 rounded-tr-xl drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[5px] border-l-[5px] border-blue-500 rounded-bl-xl drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[5px] border-r-[5px] border-blue-500 rounded-br-xl drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
          
          {/* Animated Laser Line */}
          {!isProcessing && (
            <div className="absolute left-0 right-0 h-1.5 bg-blue-500 animate-scan-laser shadow-[0_0_20px_rgba(59,130,246,1)] z-10 w-[90%] mx-auto rounded-full"></div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-3" />
              <p className="text-white font-bold text-sm tracking-widest uppercase animate-pulse">Decrypting</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-center text-white/80 font-medium text-sm flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Point camera at gate pass QR
        </p>
      </div>
    </div>
  );
}
