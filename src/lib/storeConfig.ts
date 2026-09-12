type PublicEnv = Record<string, string | undefined>;

const publicEnv = ((import.meta as ImportMeta & { env?: PublicEnv }).env ?? {}) as PublicEnv;

function value(name: string, fallback: string) {
  return publicEnv[name]?.trim() || fallback;
}

function normalizedOrigin(input: string) {
  return input.replace(/\/+$/, "");
}

const generatedVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/** Public, non-secret storefront settings. Secrets remain server-only environment variables. */
export const STORE_CONFIG = Object.freeze({
  socialInstagram: value("VITE_SOCIAL_INSTAGRAM", ""),
  socialFacebook: value("VITE_SOCIAL_FACEBOOK", ""),
  socialX: value("VITE_SOCIAL_X", ""),
  socialYoutube: value("VITE_SOCIAL_YOUTUBE", ""),
  name: value("VITE_STORE_NAME", "Space Call"),
  version: generatedVersion,
  siteUrl: normalizedOrigin(value("VITE_SITE_URL", "https://spacecallapp.store")),
  shopifyDomain: value("VITE_SHOPIFY_STORE_DOMAIN", "dj6qeq-j9.myshopify.com")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, ""),
  shopifyApiVersion: value("VITE_SHOPIFY_API_VERSION", "2026-07"),
  whatsappNumber: value("VITE_WHATSAPP_NUMBER", "96181813805").replace(/\D/g, ""),
});

export const STORE_NAME = STORE_CONFIG.name;
export const STORE_VERSION = STORE_CONFIG.version;
export const SITE_URL = STORE_CONFIG.siteUrl;
export const SHOP_ACCOUNT_URL = `https://${STORE_CONFIG.shopifyDomain}/account`;

export function storeUrl(path = "/") {
  const normalized = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SITE_URL}${normalized}`;
}
