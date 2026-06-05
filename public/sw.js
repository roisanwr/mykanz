// Service Worker minimal untuk PWA installability
// MyKanz — Wealth Management

const CACHE_NAME = 'mykanz-v1';

// Asset statis yang di-cache saat install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// ── Install: pre-cache static assets ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Jangan fail install kalau ada asset yang gagal di-cache
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: hapus cache lama ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network First, fallback ke cache ────────────────────────
// Strategi: selalu coba network dulu (biar data keuangan selalu fresh),
// fallback ke cache kalau offline.
self.addEventListener('fetch', (event) => {
  // Skip non-GET dan API requests (biar tidak cache data sensitif)
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/webpack-hmr')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response yang sukses (hanya static assets)
        if (
          response.ok &&
          (event.request.url.includes('/icons/') ||
            event.request.url.includes('/manifest.json'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: coba dari cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback ke root jika navigasi
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
