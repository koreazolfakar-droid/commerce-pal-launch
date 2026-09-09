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

import anker from "@/assets/brands/anker.svg";
import apple from "@/assets/brands/apple.svg";
import samsung from "@/assets/brands/samsung.png";
import xiaomi from "@/assets/brands/xiaomi.svg";
import blackshark from "@/assets/brands/blackshark.svg";
import poco from "@/assets/brands/poco.png";
import realme from "@/assets/brands/realme.svg";
import redmagic from "@/assets/brands/redmagic.png";
import redmi from "@/assets/brands/redmi.svg";
import tecno from "@/assets/brands/tecno.svg";
import ugreen from "@/assets/brands/ugreen.png";
import vention from "@/assets/brands/vention.png";

const LOCAL_LOGOS: Record<string, string> = {
  apple,
  samsung,
  xiaomi,
  anker,
  blackshark,
  "black-shark": blackshark,
  poco,
  realme,
  redmagic,
  "red-magic": redmagic,
  redmi,
  tecno,
  ugreen,
  vention,
};

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

/**
 * Logo sources are deliberately limited to Shopify-hosted brand images and
 * Simple Icons. Shopify wins because merchants can upload the exact official
 * brand asset they are licensed to use in the matching collection image.
 */
export function brandLogoSources(slug: string, label: string, _size = 128): string[] {
  const sources: string[] = [];
  const key = brandKey(slug, label);
  const local = LOCAL_LOGOS[key];
  if (local) return [local];
  const icon = BRAND_META[key]?.icon;
  if (icon) sources.push(`https://cdn.simpleicons.org/${icon}`);
  return sources;
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
  { bg: "#E0E7FF", fg: "#3730A3" }, // indigo
  { bg: "#CFFAFE", fg: "#155E75" }, // cyan
  { bg: "#FFEDD5", fg: "#9A3412" }, // orange
  { bg: "#DCFCE7", fg: "#166534" }, // green
  { bg: "#FCE7F3", fg: "#9D174D" }, // pink
  { bg: "#FEF3C7", fg: "#92400E" }, // amber
  { bg: "#EDE9FE", fg: "#5B21B6" }, // violet
  { bg: "#DBEAFE", fg: "#1E40AF" }, // blue
  { bg: "#FEE2E2", fg: "#991B1B" }, // red
  { bg: "#D1FAE5", fg: "#065F46" }, // emerald
];

/** Deterministic palette pick so a given brand always renders the same colour. */
export function brandMonogramColors(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return MONOGRAM_PALETTE[hash % MONOGRAM_PALETTE.length]!;
}
