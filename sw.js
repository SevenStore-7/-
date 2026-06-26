/* ============================================================
   Seven Store — Service Worker v1.0
   Strategy: Cache First for static assets, Network First for pages
============================================================ */

const CACHE_NAME     = 'sevenstore-v1';
const RUNTIME_CACHE  = 'sevenstore-runtime-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/images/image_01.jpg',
  '/assets/images/image_02.png',
  '/assets/images/image_03.png'
];

/* ── Install: pre-cache shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: Stale-While-Revalidate for same-origin, passthrough for CDN ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET & non-http(s) */
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  /* Network-only for WhatsApp / external APIs */
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com') &&
      !url.hostname.includes('cdnjs.cloudflare.com')) return;

  /* Stale-While-Revalidate */
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(cache =>
      cache.match(request).then(cached => {
        const networkFetch = fetch(request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
