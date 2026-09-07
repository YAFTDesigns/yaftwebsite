// Minimal service worker, purely for Web Push -- no offline caching or
// asset interception, so it can't interfere with normal page loads or
// the existing PWA manifest. Scope is site-root by default (registered
// from /sw.js), but subscription itself is only ever triggered from
// the admin panel, not for public visitors.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'YAFT Admin', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'YAFT Admin';
  const options = {
    body: data.body || '',
    icon: '/favicon-192.png',
    badge: '/favicon-192.png',
    data: { url: data.url || '/admin/leads' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the notification focuses an existing admin tab if one's
// open, or opens a new one -- rather than always opening a fresh tab,
// which would pile up duplicates if Yokes taps several notifications
// over a day.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/leads';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
