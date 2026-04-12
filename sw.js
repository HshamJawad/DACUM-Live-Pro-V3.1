// ============================================================
// sw.js — DACUM Live Pro Service Worker
// Deployed at: /DACUM-Live-Pro-V3.0/sw.js
// Scope:       /DACUM-Live-Pro-V3.0/
// ============================================================

const CACHE_NAME   = 'dacum-live-pro-v5';
const BASE         = '/DACUM-Live-Pro-V3.0/';
const OFFLINE_PAGE = BASE + 'index.html';

const PRECACHE_URLS = [
  BASE + 'index.html',
  BASE + 'dacum-styles.css',
  BASE + 'dacum-responsive.css',
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
  BASE + 'refine.js',
  BASE + 'error-handler.js',
  BASE + 'autosave.js',
  BASE + 'qrcode.min.js',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'dacum-fixes.css',
  BASE + 'dacum-fixes.js',
  BASE + 'tv-refactor.css',
  BASE + 'tv-refactor.js',
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  // Force immediate activation — do NOT wait for old SW to die
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Skipped:', url, err.message)
          )
        )
      )
    )
  );
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activated and controlling page');

  event.waitUntil(
    // Claim clients first so the page is controlled immediately,
    // then clean up stale caches.
    self.clients.claim().then(() =>
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
    )
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API calls → network only
  if (url.hostname.includes('railway.app') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // CDN → network-first
  if (url.hostname !== location.hostname) {
    event.respondWith(networkFirst(request));
    return;
  }

  // App shell → cache-first
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.status === 200 && res.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_PAGE);
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    return caches.match(request) ||
           new Response('Offline', { status: 503 });
  }
}
