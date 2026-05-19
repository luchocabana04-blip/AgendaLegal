/* ═══════════════════════════════════════════════════
   SERVICE WORKER — Agenda Mariana Sánchez
   Versión 1.0 (anti-pantalla negra safe)
═══════════════════════════════════════════════════ */

const CACHE_NAME   = 'agenda-legal-v1';
const REACT_CDN    = 'https://unpkg.com/react@18/umd/react.production.min.js';
const REACTDOM_CDN = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
const BABEL_CDN    = 'https://unpkg.com/@babel/standalone/babel.min.js';
const SUPABASE_CDN = 'https://unpkg.com/@supabase/supabase-js@2';
const FONTS_CDN    = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap';

const CACHE_URLS = [
  './index.html',
  './manifest.json',
  // Debes asegurarte de que estos archivos de imagen sean los de MS&A
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  REACT_CDN,
  REACTDOM_CDN,
  BABEL_CDN,
  SUPABASE_CDN
];

/* ── INSTALACIÓN ── */
self.addEventListener('install', event => {
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
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

/* ── FETCH (Estrategia: Cache-First con fallback a red) ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Servir desde caché y actualizar en background
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // No está en caché: ir a la red
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;
        const cloned = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return networkResponse;
      }).catch(() => {
        // Offline y sin caché: devolver la app principal
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

console.log('[SW] Service Worker MS&A Safe cargado v1');
