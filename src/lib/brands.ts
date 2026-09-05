/**
 * Brand logo resolution.
 *
 * Every Shopify vendor/brand is resolved to a logo URL automatically from its
 * normalized name — no per-homepage editing when a new company is added:
 *   1. explicit slug → icon-slug/domain map (curated for the common brands)
 *   2. heuristic: normalized name as a Simple Icons slug
 *   3. Logo.dev by domain when a publishable key is configured
 * Anything unresolved renders a polished monogram instead of a broken image.
 */

export interface BrandMeta {
  /** simple-icons slug (https://cdn.simpleicons.org/<slug>) */
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

const LOGO_DEV_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY"] as
  | string
  | undefined;

export function brandMeta(slug: string): BrandMeta {
  return BRAND_META[slug] ?? {};
}

/** Normalizes a brand label into a probable simple-icons slug. */
function iconSlug(slug: string, label: string) {
  const explicit = BRAND_META[slug]?.icon;
  if (explicit) return explicit;
  const guess = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  return guess.length >= 2 && guess.length <= 24 ? guess : undefined;
}

/**
 * Ordered list of logo candidates. The component walks it and falls back to a
 * monogram when every candidate fails, so a broken image is never shown.
 *
 * Favicon services were deliberately dropped: they return tiny, low-quality
 * icons and leak every page view to third parties. Shopify's own collection
 * image (passed in by the caller) always wins; Simple Icons covers the common
 * vector marks; everything else gets the monogram tile.
 */
export function brandLogoSources(slug: string, label: string, size = 128): string[] {
  const sources: string[] = [];
  const icon = iconSlug(slug, label);
  if (icon) sources.push(`https://cdn.simpleicons.org/${icon}`);
  const guessed = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = BRAND_META[slug]?.domain ?? (guessed.length >= 2 ? `${guessed}.com` : undefined);
  if (LOGO_DEV_KEY && domain) {
    sources.push(`https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}&size=${size}&format=png`);
  }
  return sources;
}

/** 1–2 letter monogram used by the fallback tile. */
export function brandMonogram(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}
