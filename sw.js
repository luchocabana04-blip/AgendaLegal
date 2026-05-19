/* ═══════════════════════════════════════════════════
   SERVICE WORKER — González & Asociados Agenda
   Versión 1.0
═══════════════════════════════════════════════════ */

const CACHE_NAME   = 'agenda-legal-v1';
const REACT_CDN    = 'https://unpkg.com/react@18/umd/react.production.min.js';
const REACTDOM_CDN = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
const BABEL_CDN    = 'https://unpkg.com/@babel/standalone/babel.min.js';
const FONTS_CDN    = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap';

const CACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  REACT_CDN,
  REACTDOM_CDN,
  BABEL_CDN,
];

/* ── INSTALACIÓN ── */
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] No se pudo cachear:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

/* ── ACTIVACIÓN ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando caché antiguo:', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

/* ── FETCH (Estrategia: Cache-First con fallback a red) ── */
self.addEventListener('fetch', event => {
  // Saltar solicitudes que no son GET
  if (event.request.method !== 'GET') return;

  // Saltar extensiones de Chrome
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Servir desde caché y actualizar en background
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const cloned = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
            }
            return networkResponse;
          })
          .catch(() => {});
        return cachedResponse;
      }

      // No está en caché: ir a la red
      return fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return networkResponse;
        })
        .catch(() => {
          // Offline y sin caché: devolver la app principal
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

/* ── SINCRONIZACIÓN EN BACKGROUND (futuro) ── */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-agenda') {
    console.log('[SW] Sincronización en background');
  }
});

/* ── NOTIFICACIONES PUSH (futuro) ── */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title   = data.title   || 'González & Asociados';
  const options = {
    body:    data.body    || 'Tienes un evento próximo.',
    icon:    './icon-192.png',
    badge:   './icon-192.png',
    vibrate: [200, 100, 200],
    data:    { url: data.url || './' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

console.log('[SW] Service Worker cargado — Agenda Legal v1');
