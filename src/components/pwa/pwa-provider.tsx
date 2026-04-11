'use client';

import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { isSupported, isReady, update } = useServiceWorker();

  useEffect(() => {
    if (isReady && 'Notification' in window && Notification.permission === 'default') {
      // Could prompt user to enable notifications here
    }
  }, [isReady]);

  return (
    <>
      {children}
      {isSupported && isReady && (
        <InstallPrompt />
      )}
    </>
  );
}

function InstallPrompt() {
  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      // Store the event for later use
      (window as unknown as { deferredPrompt?: Event }).deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  return null;
}
