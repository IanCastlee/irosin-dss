// MDRRMO Admin Service Worker for System Push Notifications
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Event
self.addEventListener('push', event => {
  let data = {
    title: '🚨 MDRRMO Irosin Emergency Alert',
    body: 'May bagong ulat ng sakuna na natanggap.',
    tag: 'mdrrmo-alert',
    data: { url: '/disaster-reports' }
  };

  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (e) {
    try {
      if (event.data) {
        data.body = event.data.text();
      }
    } catch {}
  }

  const options = {
    body: data.body,
    tag: data.tag || 'mdrrmo-' + Date.now(),
    renotify: true,
    data: data.data || { url: '/disaster-reports' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Click -> Focus or open admin dashboard
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
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
