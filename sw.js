/**
 * Fatsa BİLSEM — Service Worker
 * Offline çalışma, cache yönetimi
 */

const CACHE_NAME = 'bilsem-v12';
const ASSETS = [
  './',
  './index.html',
  './privacy-policy.html',
  './terms-of-service.html',
  './css/main.css',
  './css/globals.css',
  './js/theme.js',
  './icons/geogo.svg',
  './css/components.css',
  './css/animations.css',
  './js/data.js',
  './js/ui.js',
  './js/importers.js',
  './js/dashboard.js',
  './js/pages/setup.js',
  './js/pages/import.js',
  './js/supabase.js',
  './js/store.js',
  './js/auth.js',
  './js/router.js',
  './js/notifications.js',
  './js/pages/login.js',
  './js/pages/home.js',
  './js/pages/schedule.js',
  './js/pages/attendance.js',
  './js/pages/homework.js',
  './js/pages/students.js',
  './js/pages/stats.js',
  './js/pages/settings.js',
  './js/pages/annual_plan.js',
  './js/pages/competitions.js',
  './js/app.js',
  './manifest.json',
  './favicon.ico',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo.png'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Cache only public application assets, never account API responses or uploads.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const asset = './' + url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (!ASSETS.includes(asset)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(new Request(url.origin + url.pathname), response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      throw error;
    }
  })());
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Fatsa BİLSEM';
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
