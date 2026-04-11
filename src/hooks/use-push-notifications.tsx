'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationContextType {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscriptionData | null;
  loading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission | null>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}

interface PushNotificationProviderProps {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkExistingSubscription();
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        const subData: PushSubscriptionData = {
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: existingSubscription.toJSON().keys?.p256dh || '',
            auth: existingSubscription.toJSON().keys?.auth || '',
          },
        };
        setSubscription(subData);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<NotificationPermission | null> => {
    if (!('Notification' in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      toast.error('Push notifications are not supported');
      return false;
    }

    try {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subData: PushSubscriptionData = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.toJSON().keys?.p256dh || '',
          auth: sub.toJSON().keys?.auth || '',
        },
      };

      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subData),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setSubscription(subData);
      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  }, [isSupported, VAPID_PUBLIC_KEY, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      await fetch(`/api/push?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: 'DELETE',
      });

      setSubscription(null);
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
    }
  }, [subscription]);

  const value: PushNotificationContextType = {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
