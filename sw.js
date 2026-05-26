// Gym Tracker — Service Worker
// Bump CACHE_NAME whenever you need to force a full re-cache on all devices.
const CACHE_NAME = 'gym-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './apple-touch-icon.png',
  './favicon.png',
];

// ── Install ──────────────────────────────────────────────────────────────────
// Pre-cache all local assets so the app works fully offline.
// skipWaiting() makes the new SW take control right after install
// (no waiting for tabs to close).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
// Delete any old cache versions so stale assets don't accumulate.
// clients.claim() lets this SW handle pages opened before registration.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
// Strategy: stale-while-revalidate (same-origin only).
//   1. Serve the cached version immediately (fast, works offline).
//   2. Fetch the network copy in the background and refresh the cache.
//   3. Next launch the user gets the updated version automatically.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Let external requests (Google Fonts, CDNs, etc.) pass through untouched.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        // Always kick off a background network fetch to keep cache fresh.
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        // Return the cached copy straight away; fall back to network if
        // nothing is cached yet (first visit).
        return cached || networkFetch;
      })
    )
  );
});
