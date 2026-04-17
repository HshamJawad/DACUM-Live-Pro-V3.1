// ============================================================
// sw.js — DACUM Live Pro Service Worker  v7
// Deployed at: /DACUM-Live-Pro-V3.0/sw.js
// Scope:       /DACUM-Live-Pro-V3.0/
//
// FIXES in v7
//   • start_url no longer uses ?pwa=1 — cache key mismatch removed
//   • ignoreSearch:true on all HTML/navigate matches
//   • networkFirst stores HTML under canonical URL (no query string)
//   • Aggressive skipWaiting in both install AND message handler
//   • Activate notifies ALL clients to reload once, with version tag
// ============================================================

const CACHE_VERSION = 'v7';
const CACHE_NAME    = 'dacum-live-pro-' + CACHE_VERSION;
const BASE          = '/DACUM-Live-Pro-V3.0/';
const OFFLINE_URL   = BASE + 'index.html';

// HTML and manifest are always fetched fresh (network-first).
// All other same-origin assets use cache-first + bg-revalidate.
const ALWAYS_FRESH = [
  /\/index\.html/,
  /\/manifest\.json/,
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

// ── Helpers ───────────────────────────────────────────────────

/** Strip query string — used as canonical cache key for HTML. */
function canonicalUrl(request) {
  var u = new URL(request.url);
  u.search = '';
  return u.toString();
}

/** True when the request pathname matches an always-fresh rule. */
function isAlwaysFresh(request) {
  var pathname = new URL(request.url).pathname;
  return ALWAYS_FRESH.some(function (re) { return re.test(pathname); });
}

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', function (event) {
  console.log('[SW ' + CACHE_VERSION + '] Installing...');
  // Skip waiting IMMEDIATELY — do not wait for old tabs to close.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Precache skipped:', url, err.message);
          });
        })
      );
    }).then(function () {
      console.log('[SW ' + CACHE_VERSION + '] Precache complete');
    })
  );
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', function (event) {
  console.log('[SW ' + CACHE_VERSION + '] Activating...');
  event.waitUntil(
    // 1. Claim ALL open clients immediately (including installed PWA windows).
    self.clients.claim()
      .then(function () {
        // 2. Delete every cache from previous versions.
        return caches.keys().then(function (keys) {
          return Promise.all(
            keys.filter(function (k) { return k !== CACHE_NAME; })
                .map(function (k) {
                  console.log('[SW] Removing old cache:', k);
                  return caches.delete(k);
                })
          );
        });
      })
      .then(function () {
        // 3. Notify every open window (including standalone PWA) to reload.
        console.log('[SW ' + CACHE_VERSION + '] Sending SW_UPDATED to all clients');
        return self.clients.matchAll({
          type:             'window',
          includeUncontrolled: true
        }).then(function (clients) {
          clients.forEach(function (client) {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
          });
        });
      })
  );
});

// ── Message handler ───────────────────────────────────────────
self.addEventListener('message', function (event) {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING — activating now');
    self.skipWaiting();
  }
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // 1. External API (Railway etc.) → network only, never cache
  if (url.hostname.includes('railway.app') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // 2. Cross-origin CDN → network-first (fonts, libraries)
  if (url.hostname !== self.location.hostname) {
    event.respondWith(networkFirst(req, false));
    return;
  }

  // 3. HTML + manifest → network-first, canonical cache key
  if (isAlwaysFresh(req)) {
    event.respondWith(networkFirstHtml(req));
    return;
  }

  // 4. Everything else (JS, CSS, images) → cache-first + bg refresh
  event.respondWith(cacheFirst(req));
});

// ── Strategy: network-first for HTML/manifest ─────────────────
// Stores response under the canonical URL (no query string)
// so ?pwa=1 and plain index.html share the same cache entry.
async function networkFirstHtml(request) {
  var canonical = canonicalUrl(request);
  try {
    var res = await fetch(canonical, { cache: 'no-cache' });
    if (res && res.status === 200) {
      var cache = await caches.open(CACHE_NAME);
      // Store under canonical URL so any query variant finds it
      await cache.put(canonical, res.clone());
    }
    return res;
  } catch (_) {
    // Offline fallback — search ignoring query string
    var cached = await caches.match(canonical, { ignoreSearch: true });
    if (!cached) cached = await caches.match(OFFLINE_URL, { ignoreSearch: true });
    if (cached) return cached;
    return new Response(
      '<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:60px">' +
      '<h2>📶 You are offline</h2><p>DACUM Live Pro will be available when you reconnect.</p>' +
      '</body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ── Strategy: network-first for CDN ──────────────────────────
async function networkFirst(request) {
  try {
    var res = await fetch(request);
    if (res && res.status === 200 && res.type !== 'opaque') {
      var cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    return (await caches.match(request)) ||
           new Response('Offline', { status: 503 });
  }
}

// ── Strategy: cache-first + stale-while-revalidate ───────────
async function cacheFirst(request) {
  var cached = await caches.match(request);
  if (cached) {
    bgRefresh(request); // update silently in background
    return cached;
  }
  // Not in cache — fetch, cache, return
  try {
    var res = await fetch(request);
    if (res && res.status === 200 && res.type !== 'opaque') {
      var cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    return new Response('Offline', { status: 503 });
  }
}

// Background refresh (fire-and-forget)
function bgRefresh(request) {
  fetch(request).then(function (res) {
    if (res && res.status === 200 && res.type !== 'opaque') {
      caches.open(CACHE_NAME).then(function (cache) { cache.put(request, res); });
    }
  }).catch(function () {});
}
