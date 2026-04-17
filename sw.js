// ============================================================
// sw.js — DACUM Live Pro Service Worker  v8
// Deployed at: /DACUM-Live-Pro-V3.0/sw.js
// Scope:       /DACUM-Live-Pro-V3.0/
//
// v8 CHANGES (fixes PWA showing old sidebar):
//   • JS + CSS files → network-first (was cache-first)
//     Ensures new dacum_projects.js / dacum-mobile.js always load fresh.
//   • HTML + manifest → network-first (unchanged)
//   • Images → cache-first (safe, don't change often)
//   • Cache version bumped → wipes v5/v6/v7 caches on activate
//   • Activate sends SW_UPDATED to ALL clients including uncontrolled
// ============================================================

const CACHE_VERSION = 'v8';
const CACHE_NAME    = 'dacum-live-pro-' + CACHE_VERSION;
const BASE          = '/DACUM-Live-Pro-V3.0/';
const OFFLINE_URL   = BASE + 'index.html';

// These resource types are served network-first (fresh code always wins).
// Images/icons are still cache-first since they rarely change.
const NETWORK_FIRST_EXT = /\.(html|js|css|json)(\?.*)?$/i;

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

// ── Install: precache all assets, activate immediately ────────
self.addEventListener('install', function (event) {
  console.log('[SW ' + CACHE_VERSION + '] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          // Fetch with no-cache to bypass any HTTP cache — gets fresh files
          return fetch(url, { cache: 'no-store' })
            .then(function (res) {
              if (res && res.status === 200) return cache.put(url, res);
            })
            .catch(function (err) {
              console.warn('[SW] Precache skipped:', url, err.message);
            });
        })
      );
    }).then(function () {
      console.log('[SW ' + CACHE_VERSION + '] Precache complete');
    })
  );
});

// ── Activate: claim clients, purge old caches, notify to reload
self.addEventListener('activate', function (event) {
  console.log('[SW ' + CACHE_VERSION + '] Activating...');
  event.waitUntil(
    self.clients.claim()
      .then(function () {
        return caches.keys().then(function (keys) {
          return Promise.all(
            keys.filter(function (k) { return k !== CACHE_NAME; })
                .map(function (k) {
                  console.log('[SW] Deleting old cache:', k);
                  return caches.delete(k);
                })
          );
        });
      })
      .then(function () {
        console.log('[SW ' + CACHE_VERSION + '] Notifying all clients');
        return self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        }).then(function (clients) {
          clients.forEach(function (client) {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
          });
        });
      })
  );
});

// ── Message: handle SKIP_WAITING + GET_VERSION from page ────────
self.addEventListener('message', function (event) {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }
  // Version query — page checks if controller is up to date
  if (event.data.type === 'GET_VERSION') {
    var port = event.ports && event.ports[0];
    var reply = { type: 'VERSION_REPLY', version: CACHE_VERSION };
    if (port) {
      port.postMessage(reply);
    } else if (event.source) {
      event.source.postMessage(reply);
    }
  }
});

// ── Fetch: route each request to the right strategy ──────────
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // External API → network only
  if (url.hostname.includes('railway.app') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Cross-origin CDN → network-first with cache fallback
  if (url.hostname !== self.location.hostname) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Same-origin HTML, JS, CSS, JSON → network-first
  // This ensures new sidebar code always loads, even after install
  if (NETWORK_FIRST_EXT.test(url.pathname)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Images and other static assets → cache-first
  event.respondWith(cacheFirst(req));
});

// ── Network-first: try network, cache on success, fallback to cache
async function networkFirst(request) {
  var canonical = request.url.split('?')[0]; // strip query for consistent cache key
  try {
    var res = await fetch(canonical, { cache: 'no-cache' });
    if (res && res.status === 200 && res.type !== 'opaque') {
      var cache = await caches.open(CACHE_NAME);
      cache.put(canonical, res.clone());
    }
    return res;
  } catch (_) {
    // Offline: serve from cache (any query variant accepted)
    var cached = await caches.match(canonical) ||
                 await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return (await caches.match(OFFLINE_URL)) ||
             new Response(
               '<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:60px">' +
               '<h2>\uD83D\uDCF6 You are offline</h2>' +
               '<p>DACUM Live Pro will reload when reconnected.</p>' +
               '</body></html>',
               { status: 503, headers: { 'Content-Type': 'text/html' } }
             );
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── Cache-first: serve cache, refresh in background
async function cacheFirst(request) {
  var cached = await caches.match(request);
  if (cached) {
    // Background refresh
    fetch(request).then(function (res) {
      if (res && res.status === 200 && res.type !== 'opaque') {
        caches.open(CACHE_NAME).then(function (c) { c.put(request, res); });
      }
    }).catch(function () {});
    return cached;
  }
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
