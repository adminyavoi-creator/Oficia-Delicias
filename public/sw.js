/* Vite replaces this placeholder with the generated production asset list. */
const firebaseConfig = __OFICIA_FIREBASE_CONFIG__;
if (firebaseConfig?.apiKey && firebaseConfig?.appId) {
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const data = payload.data ?? {};
    const title = payload.notification?.title ?? 'Oficia';
    return self.registration.showNotification(title, {
      body: payload.notification?.body ?? 'Tienes una actualización.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.bookingId ? `oficia-${data.bookingId}` : `oficia-${Date.now()}`,
      data,
    });
  });

  self.addEventListener('notificationclick', event => {
    event.notification.close();
    const data = event.notification.data ?? {};
    const target = new URL('/', self.location.origin);
    target.searchParams.set('oficia_screen', String(data.screen ?? 'home'));
    if (data.bookingId) target.searchParams.set('oficia_bookingId', String(data.bookingId));
    if (data.spaceId) target.searchParams.set('oficia_spaceId', String(data.spaceId));
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      const client = windows.find(window => new URL(window.url).origin === self.location.origin);
      if (client) return client.navigate(target.href).then(() => client.focus());
      return self.clients.openWindow(target.href);
    }));
  });
}

const PRECACHE = self.__OFICIA_PRECACHE__ || ['/'];
const CACHE_PREFIX = 'oficia-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}__OFICIA_REVISION__`;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/', response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && url.pathname.startsWith('/assets/')) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
