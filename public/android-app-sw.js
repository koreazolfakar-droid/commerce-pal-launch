import { APP_ORIGIN, CACHE_CONFIG, CACHE_PREFIX, classifyCacheRequest, isCacheableResponse } from "./android-app-cache-policy.js";

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
  return fetch(new Request(request, { credentials: "omit" }));
}

async function putSafe(cache, request, response, kind, config) {
  if (!isCacheableResponse(response, kind)) return;
  const body = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT, String(Date.now()));
  await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
  const keys = await cache.keys();
  while (keys.length > config.maxEntries) await cache.delete(keys.shift());
}

async function cacheFirst(request, kind) {
  const config = CACHE_CONFIG[kind];
  const cache = await caches.open(config.name);
  const hit = await cache.match(request);
  if (hit && !expired(hit, config.maxAgeSeconds)) return hit;
  if (hit) await cache.delete(request);
  const response = await safeFetch(request);
  await putSafe(cache, request, response, kind, config);
  return response;
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

async function networkFirst(request) {
  const config = CACHE_CONFIG.catalog;
  const cache = await caches.open(config.name);
  try {
    const response = await safeFetch(request);
    await putSafe(cache, request, response, "catalog", config);
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit && !expired(hit, config.maxAgeSeconds)) return hit;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (self.location.origin !== APP_ORIGIN) return;
  const kind = classifyCacheRequest(event.request);
  if (kind === "static") event.respondWith(cacheFirst(event.request, kind));
  else if (kind === "images") event.respondWith(staleWhileRevalidate(event.request, kind, event));
  else if (kind === "catalog") event.respondWith(networkFirst(event.request));
});
