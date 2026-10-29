/* NTS service worker (hand-written, registered in production only).
 *
 * Served by src/app/sw.js/route.ts, which replaces __BUILD_ID__ at build time,
 * so every deploy produces a byte-different sw.js and the browser treats it as
 * a new version.
 *
 * CACHING POLICY — read before changing:
 * Only public static files are cached: hashed /_next/static bundles, the
 * icons, the NTS logo, the bundled fonts, the offline page and the static
 * launch screen the installed app opens on. We never cache
 * or intercept:
 *   - /api/* (including /api/files and /api/auth), because those responses
 *     carry private HR, payroll, payment and customer data and must never be
 *     readable from a shared device's cache;
 *   - sign-in and password-reset pages, so session handling, deactivation and
 *     rate limiting stay purely server-side;
 *   - any non-GET request (server actions are POSTs);
 *   - HTML pages and RSC payloads: navigations always go to the network and
 *     are never stored.
 * Requests we do not handle fall through to the browser untouched.
 */
const BUILD_ID = "__BUILD_ID__";
const CACHE_PREFIX = "nts-static-";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;
const OFFLINE_URL = "/offline.html";
const LAUNCH_URL = "/launch.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  LAUNCH_URL,
  "/brand/nts-logo-light.png",
  "/brand/nts-logo-dark.png",
  "/brand/nts-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const NEVER_HANDLE_PREFIXES = ["/api/", "/login", "/forgot-password", "/reset-password"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  // No skipWaiting() here: the new worker waits until the user clicks
  // "Update now", which posts { type: "SKIP_WAITING" }.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isHashedBundle(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isStaticAsset(url) {
  return (
    isHashedBundle(url) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    /^\/brand\/nts-logo(-light|-dark)?\.png$/.test(url.pathname) ||
    url.pathname === OFFLINE_URL ||
    url.pathname === LAUNCH_URL
  );
}

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}

// Hashed bundles never change for a given URL, so cache-first is safe.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

// Icons, logo and fonts: serve from cache, refresh in the background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

// Network-first for page loads; the HTML itself is never cached. Only a
// network failure (not an HTTP error) falls back to the static offline page.
async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // The launch screen is static and public, so it opens straight from cache
  // and refreshes in the background.
  if (request.mode === "navigate" && url.pathname === LAUNCH_URL) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Sign-in pages still get the offline fallback; nothing of theirs is stored.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (NEVER_HANDLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      isHashedBundle(url) ? cacheFirst(request) : staleWhileRevalidate(request),
    );
  }
});
