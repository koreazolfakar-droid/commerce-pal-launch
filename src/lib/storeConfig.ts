type PublicEnv = Record<string, string | undefined>;

const publicEnv = ((import.meta as ImportMeta & { env?: PublicEnv }).env ?? {}) as PublicEnv;

function value(name: string, fallback: string) {
  return publicEnv[name]?.trim() || fallback;
}

function normalizedOrigin(input: string) {
  return input.replace(/\/+$/, "");
}

const generatedVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const defaultStoreName = value("VITE_STORE_NAME", "Space Call");
const defaultWhatsappNumber = value("VITE_WHATSAPP_NUMBER", "96181813805");

/** Order/account navigation remains owned by Space Call. */
export const SHOP_ACCOUNT_URL = `${SITE_URL}/help#account-orders`;

export function storeUrl(path = "/") {
  const normalized = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SITE_URL}${normalized}`;
}
