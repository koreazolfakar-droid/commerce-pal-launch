export const APP_ORIGIN = "https://app.spacecallapp.store";
export const SUPABASE_ORIGIN = "https://rtwyankpxtffqqrasyzw.supabase.co";
export const CACHE_VERSION = "v3";
export const CACHE_PREFIX = "space-call-android-";
export const CACHE_CONFIG = Object.freeze({
  images: { name: `${CACHE_PREFIX}images-${CACHE_VERSION}`, maxEntries: 120, maxAgeSeconds: 7 * 86400 },
});

const SECRET_PARAMS = /^(?:token|access_token|refresh_token|code|state|session|password|email)$/i;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const DATE = "\\d{4}-\\d{2}-\\d{2}";
const MEDIA_PATH = new RegExp(`^/storage/v1/object/public/cms-media/(?:hero/${DATE}/${UUID}|optimized/(?:product|brand|category|hero)/${DATE}/${UUID}|brands/logos/${UUID}|categories/${UUID}/${UUID}|products/${UUID}/${UUID}|variants/${UUID}/${UUID}|settings/branding/${UUID})\\.(?:webp|png|jpe?g|avif)$`, "i");

function hasSecretQuery(url) {
  return [...url.searchParams.keys()].some((key) => SECRET_PARAMS.test(key));
}

export function isApprovedMediaUrl(url) {
  if (url.origin !== SUPABASE_ORIGIN || !MEDIA_PATH.test(url.pathname)) return false;
  if (!url.search) return true;
  return url.pathname.includes("/variants/") && [...url.searchParams.keys()].length === 1 && url.searchParams.has("v") && /^\d{1,10}$/.test(url.searchParams.get("v") ?? "");
}

export function classifyCacheRequest(request) {
  if (!request || request.method !== "GET" || request.mode === "navigate") return null;
  if (request.headers?.has("authorization") || request.headers?.has("cookie")) return null;

  let url;
  try { url = new URL(request.url); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || hasSecretQuery(url)) return null;

  // Browser Fetch hides Set-Cookie even on same-origin responses. Do not place
  // un-sanitized app-host responses (including static assets) in Cache Storage.
  if (url.origin === APP_ORIGIN) return null;

  if (url.origin === SUPABASE_ORIGIN) {
    if (isApprovedMediaUrl(url)) return "images";
  }

  return null;
}

export function isCacheableResponse(response, expectedKind) {
  if (!response?.ok || !["basic", "cors"].includes(response.type)) return false;
  if (response.headers.has("set-cookie")) return false;
  const control = response.headers.get("cache-control") ?? "";
  if (/\b(?:private|no-store)\b/i.test(control)) return false;
  const type = response.headers.get("content-type") ?? "";
  if (expectedKind === "images") return response.headers.get("x-space-call-cache-safe") === "1" && /^image\//i.test(type);
  if (expectedKind === "catalog") return /^application\/json\b/i.test(type);
  return /^(?:text\/(?:css|javascript)|application\/(?:javascript|font-woff)|font\/|image\/)/i.test(type);
}
