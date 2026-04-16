// ============================================================
// sw.js — DACUM Live Pro Service Worker  v6
// Deployed at: /DACUM-Live-Pro-V3.0/sw.js
// Scope:       /DACUM-Live-Pro-V3.0/
//
// Update strategy
//   • HTML / manifest  → Network-first  (always fresh)
//   • Static assets    → Cache-first    (fast + offline)
//   • CDN resources    → Network-first  (with cache fallback)
//   • API / railway    → Network-only
//
// Auto-update mechanism
//   1. skipWaiting()   → new SW activates immediately
//   2. clients.claim() → new SW controls open pages at once
//   3. SW posts 'SW_UPDATED' message → page reloads once
//   4. Old caches deleted on activate
// ============================================================

const CACHE_VERSION = 'v6';
const CACHE_NAME    = `dacum-live-pro-${CACHE_VERSION}`;
const BASE          = '/DACUM-Live-Pro-V3.0/';
const OFFLINE_PAGE  = BASE + 'index.html';

const NETWORK_FIRST_PATTERNS = [
  /\.html(\?.*)?$/,
  /manifest\.json(\?.*)?$/,
];

const PRECACHE_URLS = [
  BASE + 'index.html',
  BASE + 'dacum-styles.css',
  BASE + 'dacum-responsive.css',
  BASE + 'dacum-fixes.css',
  BASE + 'dacum-typography.css',
  BASE + 'tv-refactor.css',
  BASE + 'app.js',
  BASE + 'state.js',
  BASE + 'renderer.js',
  BASE + 'duties.js',
  BASE + 'events.js',
  BASE + 'history.js',
  BASE + 'storage.js',
  BASE + 'tabs.js',
  BASE + 'tasks.js',
  BASE + 'modules.js',
  BASE + 'projects.js',
  BASE + 'snapshots.js',
  BASE + 'workshop.js',
  BASE + 'workshop_snapshots.js',
  BASE + 'dacum_projects.js',
  BASE + 'dacum-ui.js',
  BASE + 'dacum-mobile.js',
  BASE + 'dacum-fixes.js',
  BASE + 'tv-refactor.js',
  BASE + 'refine.js',
  BASE + 'error-handler.js',
  BASE + 'autosave.js',
  BASE + 'qrcode.min.js',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW ' + CACHE_VERSION + '] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Precache skipped:', url, err.message)
          )
        )
      ).then(() => console.log('[SW ' + CACHE_VERSION + '] Precache complete'))
    )
  );
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW ' + CACHE_VERSION + '] Activating...');
  event.waitUntil(
    self.clients.claim()
      .then(() =>
        caches.keys().then(keys =>
          Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
          )
        )
      )
      .then(() => {
        console.log('[SW ' + CACHE_VERSION + '] Active — notifying clients');
        return self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(client =>
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
          )
        );
      })
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API / railway → network only
  if (url.hostname.includes('railway.app') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Cross-origin CDN → network-first
  if (url.hostname !== self.location.hostname) {
    event.respondWith(networkFirst(req));
    return;
  }

  // HTML + manifest → network-first (always fresh)
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(url.pathname + url.search))) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets → cache-first (fast + offline)
  event.respondWith(cacheFirst(req));
});

// ── Strategies ────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    bgRefresh(request);   // stale-while-revalidate
    return cached;
  }
  return fetchAndCache(request);
}

async function networkFirst(request) {
  try {
    const res = await fetch(request, { cache: 'no-cache' });
    if (res && res.status === 200 && res.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return (await caches.match(OFFLINE_PAGE)) ||
             new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

async function fetchAndCache(request) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200 && res.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    if (request.mode === 'navigate') {
      return (await caches.match(OFFLINE_PAGE)) ||
             new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

function bgRefresh(request) {
  fetch(request).then(res => {
    if (res && res.status === 200 && res.type !== 'opaque') {
      caches.open(CACHE_NAME).then(cache => cache.put(request, res));
    }
  }).catch(() => {});
}

// ── Message handler ───────────────────────────────────────────
// Allows the page to explicitly tell a waiting SW to activate.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received — activating immediately');
    self.skipWaiting();
  }
});
