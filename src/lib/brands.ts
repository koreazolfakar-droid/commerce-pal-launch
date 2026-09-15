/**
 * Brand logo resolution.
 *
 * Every curated logo is served from /public/brand-logos as a normal static
 * asset URL. This deliberately avoids bundler-specific SVG import behaviour
 * that can turn an SVG file into escaped markup instead of an <img> source.
 * Merchant-controlled Shopify artwork is supplied separately by BrandLogo.
 * Unknown brands deliberately fall back to the local text/monogram treatment
 * instead of making third-party logo requests that can violate CSP or slow LCP.
 */

const LOCAL_LOGOS: Record<string, string> = {
  apple: "/brand-logos/apple.svg",
  samsung: "/brand-logos/samsung.png",
  xiaomi: "/brand-logos/xiaomi.svg",
  anker: "/brand-logos/anker.svg",
  blackshark: "/brand-logos/blackshark.svg",
  "black-shark": "/brand-logos/blackshark.svg",
  lenovo: "/brand-logos/lenovo.svg",
  poco: "/brand-logos/poco.png",
  realme: "/brand-logos/realme.svg",
  redmagic: "/brand-logos/redmagic.png",
  "red-magic": "/brand-logos/redmagic.png",
  redmi: "/brand-logos/redmi.svg",
  tecno: "/brand-logos/tecno.svg",
  ugreen: "/brand-logos/ugreen.png",
  vention: "/brand-logos/vention.png",
};

export interface BrandMeta {
  /** Legacy Simple Icons slug retained as metadata; never fetched at runtime. */
  icon?: string;
  /** official domain, used by Logo.dev when a key is configured */
  domain?: string;
  /** short marketing line for promo banners */
  tagline?: string;
}

const BRAND_META: Record<string, BrandMeta> = {
  apple: { icon: "apple", domain: "apple.com", tagline: "iPhone, iPad, Watch & AirPods" },
  samsung: { icon: "samsung", domain: "samsung.com", tagline: "Galaxy phones, tablets & buds" },
  xiaomi: { icon: "xiaomi", domain: "mi.com", tagline: "Flagship specs, honest prices" },
  redmi: { icon: "xiaomi", domain: "mi.com", tagline: "Big batteries, big screens" },
  poco: { icon: "xiaomi", domain: "mi.com", tagline: "Performance-first phones" },
  google: { icon: "google", domain: "google.com", tagline: "Pixel intelligence" },
  oneplus: { icon: "oneplus", domain: "oneplus.com", tagline: "Fast and smooth" },
  huawei: { icon: "huawei", domain: "huawei.com" },
  honor: { icon: "honor", domain: "hihonor.com" },
  oppo: { icon: "oppo", domain: "oppo.com" },
  realme: { icon: "realme", domain: "realme.com" },
  vivo: { icon: "vivo", domain: "vivo.com" },
  nothing: { icon: "nothing", domain: "nothing.tech" },
  anker: { icon: "anker", domain: "anker.com", tagline: "Charge faster, everywhere" },
  baseus: { domain: "baseus.com" },
  ugreen: { domain: "ugreen.com", tagline: "Cables, hubs & chargers that last" },
  belkin: { domain: "belkin.com" },
  jbl: { icon: "jbl", domain: "jbl.com", tagline: "Sound that travels" },
  sony: { icon: "sony", domain: "sony.com" },
  bose: { icon: "bose", domain: "bose.com" },
  beats: { icon: "beatsbydre", domain: "beatsbydre.com" },
  jvc: { icon: "jvc", domain: "jvc.net" },
  lenovo: { icon: "lenovo", domain: "lenovo.com", tagline: "Work and play, everywhere" },
  asus: { icon: "asus", domain: "asus.com" },
  hp: { icon: "hp", domain: "hp.com", tagline: "Laptops built for the everyday" },
  dell: { icon: "dell", domain: "dell.com" },
  logitech: { icon: "logitech", domain: "logitech.com" },
  spigen: { domain: "spigen.com" },
  nokia: { icon: "nokia", domain: "nokia.com" },
  motorola: { icon: "motorola", domain: "motorola.com" },
  tecno: { domain: "tecno-mobile.com" },
  infinix: { domain: "infinixmobility.com" },
};

export function brandMeta(slug: string): BrandMeta {
  const key = (slug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return BRAND_META[key] ?? {};
}

function brandKey(slug: string, label: string) {
  const key = (slug || label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return key;
}

/** Curated local fallbacks only; merchant Shopify artwork is handled by BrandLogo. */
export function brandLogoSources(slug: string, label: string, _size = 128): string[] {
  const key = brandKey(slug, label);
  const local = LOCAL_LOGOS[key];
  return local ? [local] : [];
}

/** 1–2 letter monogram used by the fallback tile. */
export function brandMonogram(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}

/**
 * Curated, accessible colour pairs for the fallback monogram badge. Chosen so
 * every pair reads clearly as bold dark text on a soft tint — a deliberate,
 * premium look rather than the single flat theme colour used everywhere.
 */
const MONOGRAM_PALETTE: readonly { bg: string; fg: string }[] = [
  { bg: "#E0E7FF", fg: "#3730A3" },
  { bg: "#CFFAFE", fg: "#155E75" },
  { bg: "#FFEDD5", fg: "#9A3412" },
  { bg: "#DCFCE7", fg: "#166534" },
  { bg: "#FCE7F3", fg: "#9D174D" },
  { bg: "#FEF3C7", fg: "#92400E" },
  { bg: "#EDE9FE", fg: "#5B21B6" },
  { bg: "#DBEAFE", fg: "#1E40AF" },
  { bg: "#FEE2E2", fg: "#991B1B" },
  { bg: "#D1FAE5", fg: "#065F46" },
];

/** Deterministic palette pick so a given brand always renders the same colour. */
export function brandMonogramColors(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return MONOGRAM_PALETTE[hash % MONOGRAM_PALETTE.length]!;
}
