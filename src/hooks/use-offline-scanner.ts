'use client';

import { useState, useEffect, useCallback } from 'react';
import * as jose from 'jose';

export type OfflinePass = {
  id: string;
  status: string;
  valid_from: string;
  valid_until: string;
  qr_payload: string;
  student_id: string;
  profiles: {
    full_name: string;
    enrollment_number: string | null;
    avatar_url: string | null;
    hostel: string;
    room_number: string;
  };
};

export type OfflineScanAction = {
  id: string;
  pass_id: string;
  scan_type: 'entry' | 'exit';
  timestamp: number;
  qr_payload: string;
};

export type OfflineScanQueueResult =
  | { status: 'success' }
  | { status: 'business_rejection'; message: string }
  | { status: 'server_error' };

export function useOfflineScanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [roster, setRoster] = useState<OfflinePass[]>([]);
  const [queue, setQueue] = useState<OfflineScanAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize network state and load local storage
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    try {
      const cachedRoster = localStorage.getItem('passos_guard_roster');
      if (cachedRoster) setRoster(JSON.parse(cachedRoster));

      const cachedQueue = localStorage.getItem('passos_offline_queue');
      if (cachedQueue) setQueue(JSON.parse(cachedQueue));
    } catch (e) {
      console.error('Failed to load offline cache', e);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch roster when online
  const syncRoster = useCallback(async () => {
    if (!isOnline) return;
    try {
      const res = await fetch('/api/guard/sync');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Roster sync failed:', errorData.error || res.statusText);
        throw new Error(errorData.error || 'Failed to fetch roster');
      }
      const data = await res.json();
      if (data.passes) {
        setRoster(data.passes);
        localStorage.setItem('passos_guard_roster', JSON.stringify(data.passes));
      }
    } catch (error) {
      console.error('Roster sync error:', error);
    }
  }, [isOnline]);

  // Initial and periodic sync
  useEffect(() => {
    syncRoster();
    const interval = setInterval(syncRoster, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [syncRoster]);

  // Push queue to server when online
  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0 || isSyncing) return;
    setIsSyncing(true);

    const pendingScans = [...queue];
    const failedScans: OfflineScanAction[] = [];

    for (const scan of pendingScans) {
      try {
        const payload = {
          qr_payload: scan.qr_payload,
          scan_type: scan.scan_type,
          is_offline_sync: true,
        };

        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.status >= 500) {
          // Server error — keep in queue and retry later
          failedScans.push(scan);
        } else if (!res.ok) {
          // 4xx means business logic rejection (expired, already used, revoked, etc.)
          // Do NOT re-queue — log it so the guard can be informed
          const errorData = await res.json().catch(() => ({}));
          console.warn(
            `[offline-sync] Scan ${scan.id} rejected (${res.status}):`,
            errorData.message || errorData.error || 'Business rule prevented scan'
          );
        }
        // 2xx = success, scan is done — falls through without re-queueing
      } catch (err) {
        // Network drop during sync — re-queue and stop processing
        failedScans.push(scan);
        break;
      }
    }

    setQueue(failedScans);
    localStorage.setItem('passos_offline_queue', JSON.stringify(failedScans));
    setIsSyncing(false);
  }, [isOnline, queue, isSyncing]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  const enqueueScan = (pass_id: string, scan_type: 'entry' | 'exit', qr_payload: string) => {
    const newScan: OfflineScanAction = {
      id: crypto.randomUUID(),
      pass_id,
      scan_type,
      timestamp: Date.now(),
      qr_payload
    };
    
    const newQueue = [...queue, newScan];
    setQueue(newQueue);
    localStorage.setItem('passos_offline_queue', JSON.stringify(newQueue));
  };

  /**
   * Locally decodes a QR payload to get the pass_id.
   * NOTE: decodeJwt does NOT verify the signature — it is used only to extract the pass_id
   * for a local roster lookup. The actual cryptographic verification happens on the server
   * when the scan is submitted.
   */
  const decodeLocalPass = (qrToken: string) => {
    try {
      const decoded = jose.decodeJwt(qrToken);
      const passId = decoded.pass_id as string | undefined;
      const studentId = decoded.student_id as string | undefined;
      
      if (!passId || !studentId) return null;

      // Find in local roster cache
      const rosterMatch = roster.find(p => p.id === passId) || null;
      
      return {
        pass_id: passId,
        student_id: studentId,
        rosterMatch
      };
    } catch (e) {
      return null;
    }
  };

  /**
   * Look up a pass by enrollment number in the local roster.
   * Used for Manual Mode when QR codes are unreadable.
   */
  const lookupPassByEnrollment = (enrollment: string): OfflinePass | null => {
    if (!enrollment) return null;
    return roster.find(p => 
      p.profiles.enrollment_number?.toLowerCase() === enrollment.toLowerCase()
    ) || null;
  };

  return {
    isOnline,
    roster,
    queue,
    isSyncing,
    enqueueScan,
    syncRoster,
    decodeLocalPass,
    lookupPassByEnrollment, // Exposed for Manual Mode in guard scanner
  };
}
