// Milega Food Hyperlocal Platform - Service Worker for Native Background Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Push notifications from server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '🚨 Milega Food Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🚨 Milega Food Order Notification';
  const options = {
    body: data.body || 'New incoming order/job requiring action!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [300, 100, 300, 100, 400],
    data: data.url || '/',
    requireInteraction: true,
    tag: data.tag || 'milega-order-alert',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Focus or open browser window when user clicks notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
