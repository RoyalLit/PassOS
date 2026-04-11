/// <reference lib="webworker" />

const CACHE_NAME = 'passos-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  
  const options: NotificationOptions = {
    body: data.body || data.notification?.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag || 'passos-notification',
    data: data.data || {},
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === 'high' || data.priority === 'critical',
  };

  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
      data.title || data.notification?.title || 'PassOS',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Navigate based on notification data
  if (data.pass_id) {
    url = `/student/my-passes?pass=${data.pass_id}`;
  } else if (data.request_id) {
    url = `/student/history?request=${data.request_id}`;
  } else if (data.student_id) {
    url = `/admin/students/${data.student_id}`;
  }

  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open a new window
      if ((self as unknown as ServiceWorkerGlobalScope).clients.openWindow) {
        return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-pass-requests') {
    event.waitUntil(syncPassRequests());
  }
});

async function syncPassRequests() {
  // This would sync any offline-created pass requests
  // Implementation depends on your offline storage strategy
  console.log('Background sync: pass requests');
}

// Message event for communication with main thread
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  }
});

export {};
