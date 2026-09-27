import { APP_ORIGIN, SUPABASE_ORIGIN, CACHE_CONFIG, CACHE_PREFIX, classifyCacheRequest, isCacheableResponse } from "./android-app-cache-policy.js";

const CACHED_AT = "x-space-call-cached-at";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && !Object.values(CACHE_CONFIG).some((item) => item.name === name)) {
        await caches.delete(name);
      }
    }
    await self.clients.claim();
  })());
});

function expired(response, maxAgeSeconds) {
  const cachedAt = Number(response?.headers.get(CACHED_AT));
  return !cachedAt || Date.now() - cachedAt > maxAgeSeconds * 1000;
}

async function safeFetch(request) {
  const url = new URL(request.url);
  if (url.origin === SUPABASE_ORIGIN) {
    // The Storage CDN sets its own cookie and ordinary <img> responses are opaque.
    // Fetch only an approved object through the app's credential-free sanitizer.
    try {
      const sanitized = await fetch(`${APP_ORIGIN}/android-media${url.pathname}${url.search}`, { credentials: "omit", redirect: "error" });
      if (sanitized.ok) return sanitized;
    } catch {
      // A failed sanitizer must never create a cache entry.
    }
    return fetch(new Request(request, { credentials: "omit" }));
  }
  return fetch(new Request(request, { credentials: "omit" }));
}

async function putSafe(cache, request, response, kind, config) {
  if (new URL(request.url).origin === SUPABASE_ORIGIN &&
      (!response.url || !response.url.startsWith(`${APP_ORIGIN}/android-media/`))) return;
  if (!isCacheableResponse(response, kind)) return;
  const body = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.set(CACHED_AT, String(Date.now()));
  await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
  const keys = await cache.keys();
  while (keys.length > config.maxEntries) await cache.delete(keys.shift());
}

async function staleWhileRevalidate(request, kind, event) {
  const config = CACHE_CONFIG[kind];
  const cache = await caches.open(config.name);
  const hit = await cache.match(request);
  const refresh = safeFetch(request).then(async (response) => {
    await putSafe(cache, request, response, kind, config);
    return response;
  });
  if (hit && !expired(hit, config.maxAgeSeconds)) {
    event.waitUntil(refresh.catch(() => undefined));
    return hit;
  }
  if (hit) await cache.delete(request);
  return refresh;
}

self.addEventListener("fetch", (event) => {
  if (self.location.origin !== APP_ORIGIN) return;
  const kind = classifyCacheRequest(event.request);
  if (kind === "images") event.respondWith(staleWhileRevalidate(event.request, kind, event));
});
