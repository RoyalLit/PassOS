'use client';

import { useState } from 'react';
import { QRScanner } from '@/components/guard/qr-scanner';
import { ScanResultView } from '@/components/guard/scan-result';
import { useOfflineScanner } from '@/hooks/use-offline-scanner';
import { WifiOff, Loader2, User, RefreshCw, Keyboard, Camera, Search } from 'lucide-react';
import type { ScanVerifyResult } from '@/types';

export default function GuardScanPage() {
  const [scanType, setScanType] = useState<'exit' | 'entry'>('exit');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ScanVerifyResult | null>(null);
  
  // Pending verification state (Two-Step Workflow)
  const [pendingPass, setPendingPass] = useState<{
    qr_payload: string;
    pass_id: string;
    student_id: string;
    rosterMatch: any | null;
  } | null>(null);

  const { isOnline, isSyncing, queue, enqueueScan, decodeLocalPass, lookupPassByEnrollment } = useOfflineScanner();

  const handleScanInit = (decodedText: string) => {
    // Step 1: Instantly decode locally to get student face and pass ID for visual verification
    const decoded = decodeLocalPass(decodedText);
    
    if (!decoded) {
      setResult({
        valid: false,
        result: 'invalid_signature',
        message: 'Unrecognized QR Format. This is not a valid PassOS QR.',
      });
      return;
    }

    setPendingPass({
      qr_payload: decodedText,
      pass_id: decoded.pass_id,
      student_id: decoded.student_id,
      rosterMatch: decoded.rosterMatch
    });
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const rosterMatch = lookupPassByEnrollment(manualInput.trim());

    if (!rosterMatch) {
      setResult({
        valid: false,
        result: 'error',
        message: `No active/pending pass found for enrollment: ${manualInput}`,
      });
      return;
    }

    setPendingPass({
      qr_payload: rosterMatch.qr_payload,
      pass_id: rosterMatch.id,
      student_id: rosterMatch.student_id,
      rosterMatch: rosterMatch
    });
  };

  const handleConfirmScan = async () => {
    if (!pendingPass) return;
    setIsProcessing(true);
    
    try {
      let geo = { lat: 0, lng: 0 };
      if (navigator.geolocation && isOnline) {
         await new Promise<void>((resolve) => {
           navigator.geolocation.getCurrentPosition(
             (pos) => {
               geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
               resolve();
             },
             () => resolve(), 
             { timeout: 2000 }
           );
         });
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_payload: pendingPass.qr_payload,
          scan_type: scanType,
          geo_lat: geo.lat,
          geo_lng: geo.lng,
        }),
      });

      const data = await res.json();
      setResult(data);

    } catch {
      if (pendingPass.rosterMatch) {
         enqueueScan(pendingPass.pass_id, scanType, pendingPass.qr_payload);
         setResult({
           valid: true,
           result: 'valid',
           message: `[OFFLINE] ${scanType === 'exit' ? 'Exit Granted' : 'Welcome Back'}`,
           pass: pendingPass.rosterMatch,
           student: pendingPass.rosterMatch.profiles
         });
      } else {
        setResult({
          valid: false,
          result: 'error',
          message: 'Network Offline: Cannot verify pass without internet. Try again when online.',
        });
      }
    } finally {
      setIsProcessing(false);
      setPendingPass(null); 
    }
  };

  const handleReset = () => {
    setResult(null);
    setPendingPass(null);
    setManualInput('');
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto min-h-[calc(100vh-64px)] flex flex-col pt-12 md:pt-20">
      
      {/* Network / Offline Hook Status Header */}
      <div className="mb-6 flex justify-between items-center bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          {isOnline ? (
             <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          ) : (
             <WifiOff className="w-4 h-4 text-orange-500" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {isOnline ? 'Online mode' : 'Offline mode'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
          {queue.length > 0 && (
            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
              {queue.length} Pending Sync
            </span>
          )}
        </div>
      </div>

      {!result && !pendingPass && (
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Guard Console</h1>
          
          <div className="flex bg-muted p-1 rounded-xl w-full max-w-xs mx-auto mb-6 relative z-10 border border-border shadow-sm">
            <button
              onClick={() => setScanType('exit')}
              className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${
                scanType === 'exit' ? 'bg-card shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Exit Campus
            </button>
            <button
              onClick={() => setScanType('entry')}
              className={`flex-1 py-1.5 font-bold text-xs rounded-lg transition-all ${
                scanType === 'entry' ? 'bg-card shadow-sm text-green-600' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Enter Campus
            </button>
          </div>

          <div className="flex bg-card p-1 rounded-xl w-full max-w-xs mx-auto border border-border shadow-sm">
            <button
              onClick={() => setMode('scan')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'scan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Manual
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-start">
        {result ? (
          <div className="w-full animate-in zoom-in-95 duration-300">
            <ScanResultView result={result} onClose={handleReset} />
          </div>
        ) : pendingPass ? (
          // Two-Step Verification UI Screen
          <div className="w-full bg-card rounded-3xl p-6 border-2 border-primary/20 shadow-xl flex flex-col items-center animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-full flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-foreground">Verify Identity</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${scanType === 'exit' ? 'bg-blue-500' : 'bg-green-500'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Confirming {scanType}
                  </span>
                </div>
              </div>
              {pendingPass.rosterMatch?.profiles?.enrollment_number && (
                <span className="text-[10px] font-black px-2 py-1 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded uppercase tracking-tighter">
                  {pendingPass.rosterMatch.profiles.enrollment_number}
                </span>
              )}
            </div>

            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-muted flex items-center justify-center bg-muted/50 mb-6 shadow-inner relative group">
              <div className="absolute inset-0 bg-blue-500/5 animate-pulse group-hover:bg-transparent transition-colors" />
              {pendingPass.rosterMatch?.profiles?.avatar_url ? (
                <img src={pendingPass.rosterMatch.profiles.avatar_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-muted-foreground/30" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-1 text-center">
              {pendingPass.rosterMatch?.profiles?.full_name || 'Name syncing...'}
            </h3>
            <p className="text-muted-foreground font-medium mb-8 text-center flex items-center gap-2">
              <span className="bg-muted px-2.5 py-1 rounded-lg text-xs font-bold border border-border">
                {pendingPass.rosterMatch?.profiles?.hostel || 'Hostel'} • {pendingPass.rosterMatch?.profiles?.room_number || 'Room'}
              </span>
            </p>

            <div className="flex w-full gap-3 mt-4">
              <button 
                onClick={handleReset}
                disabled={isProcessing}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-sm active:scale-95"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleConfirmScan}
                 disabled={isProcessing}
                 className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 text-sm active:scale-95 ${
                   scanType === 'exit' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' : 'bg-green-600 hover:bg-green-700 shadow-green-500/25'
                 } shadow-xl`}
               >
                 {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (scanType === 'exit' ? 'Grant Exit' : 'Grant Entry')}
               </button>
            </div>
          </div>
        ) : mode === 'scan' ? (
          <div className="w-full animate-in fade-in duration-300">
            <QRScanner onScan={handleScanInit} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="w-full animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Manual Lookup</h3>
                  <p className="text-xs text-muted-foreground">Search by Enrollment Number</p>
                </div>
              </div>
              
              <form onSubmit={handleManualLookup} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    placeholder="ENTER ENROLLMENT NO."
                    className="w-full px-4 py-4 bg-muted/30 border border-border rounded-xl text-lg font-black tracking-widest outline-none focus:ring-2 focus:ring-blue-600 focus:bg-background transition-all placeholder:text-muted-foreground/40 placeholder:font-bold placeholder:tracking-normal"
                  />
                  {manualInput && (
                    <button 
                      type="button"
                      onClick={() => setManualInput('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Find Student Pass
                </button>
              </form>
              
              <p className="mt-6 text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest leading-relaxed">
                Requires sync data. Ensure your app has synced rosters before going offline.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
