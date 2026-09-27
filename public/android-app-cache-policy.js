export const APP_ORIGIN = "https://app.spacecallapp.store";
export const SUPABASE_ORIGIN = "https://rtwyankpxtffqqrasyzw.supabase.co";
export const CACHE_VERSION = "v1";
export const CACHE_PREFIX = "space-call-android-";
export const CACHE_CONFIG = Object.freeze({
  static: { name: `${CACHE_PREFIX}static-${CACHE_VERSION}`, maxEntries: 80, maxAgeSeconds: 30 * 86400 },
  images: { name: `${CACHE_PREFIX}images-${CACHE_VERSION}`, maxEntries: 120, maxAgeSeconds: 7 * 86400 },
  catalog: { name: `${CACHE_PREFIX}catalog-${CACHE_VERSION}`, maxEntries: 8, maxAgeSeconds: 5 * 60 },
});

const PRIVATE_PATHS = /^\/(?:dashboard|auth|login|logout|checkout|cart|orders|my-orders|profile|account|addresses|payment|payments|api|functions|rest)(?:\/|$)/i;
const SECRET_PARAMS = /^(?:token|access_token|refresh_token|code|state|session|password|email)$/i;
const VERSIONED_ASSET = /^\/assets\/.+\.[a-z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg)$/i;
const PUBLIC_IMAGE = /^\/(?:brand-logos|category-icons|product-images|hero-images|category-images|icons|images)\/.+\.(?:png|jpe?g|webp|avif|svg)$/i;

function hasSecretQuery(url) {
  return [...url.searchParams.keys()].some((key) => SECRET_PARAMS.test(key));
}

export function classifyCacheRequest(request) {
  if (!request || request.method !== "GET" || request.mode === "navigate") return null;
  if (request.headers?.has("authorization") || request.headers?.has("cookie")) return null;

  let url;
  try { url = new URL(request.url); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || hasSecretQuery(url)) return null;

  if (url.origin === APP_ORIGIN) {
    if (PRIVATE_PATHS.test(url.pathname)) return null;
    if (VERSIONED_ASSET.test(url.pathname)) return "static";
    if (PUBLIC_IMAGE.test(url.pathname)) return "images";
    if (/^\/(?:logo|favicon)(?:[-.][^/]+)?\.(?:png|svg|ico)$/i.test(url.pathname)) return "images";
    return null;
  }

  if (url.origin === SUPABASE_ORIGIN) {
    if (url.pathname === "/functions/v1/public-cms" && !url.search) return "catalog";
    if (url.pathname.startsWith("/storage/v1/object/public/cms-media/")) {
      const uniqueObject = /^\/storage\/v1\/object\/public\/cms-media\/(?:library|products|brands|hero|settings|optimized)\/(?:.+\/)?[a-z0-9-]{16,}\.(?:png|jpe?g|webp|avif|svg)$/i.test(url.pathname);
      const versionedObject = url.searchParams.has("v") || url.searchParams.has("version");
      return uniqueObject || versionedObject ? "images" : null;
    }
  }

  return null;
}

export function isCacheableResponse(response, expectedKind) {
  if (!response?.ok || !["basic", "cors"].includes(response.type)) return false;
  if (response.headers.has("set-cookie")) return false;
  const control = response.headers.get("cache-control") ?? "";
  if (/\b(?:private|no-store)\b/i.test(control)) return false;
  const type = response.headers.get("content-type") ?? "";
  if (expectedKind === "images") return /^image\//i.test(type);
  if (expectedKind === "catalog") return /^application\/json\b/i.test(type);
  return /^(?:text\/css|application\/(?:javascript|font-woff)|font\/|image\/)/i.test(type);
}
