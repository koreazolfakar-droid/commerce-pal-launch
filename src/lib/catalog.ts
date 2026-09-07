import {
  BriefcaseBusiness,
  Cable,
  Headphones,
  Laptop,
  Plug,
  Shield,
  Smartphone,
  Speaker,
  Tablet,
  Watch,
  BatteryCharging,
  type LucideIcon,
} from "lucide-react";

export interface CatalogEntry {
  /** Shopify collection handle this entry maps to. */
  handle: string;
  label: string;
  icon?: LucideIcon;
}

/** Category navigation, mapped to Shopify collection handles. */
export const CATEGORIES: CatalogEntry[] = [
  { handle: "smartphones", label: "Smartphones", icon: Smartphone },
  { handle: "tablets", label: "Tablets", icon: Tablet },
  { handle: "smartwatches", label: "Smartwatches", icon: Watch },
  { handle: "earbuds", label: "Earbuds & Headphones", icon: Headphones },
  { handle: "accessories", label: "Accessories", icon: Laptop },
  { handle: "power-banks", label: "Power Banks", icon: BatteryCharging },
  { handle: "cases", label: "Cases & Protection", icon: Shield },
  { handle: "chargers", label: "Cables & Chargers", icon: Cable },
  { handle: "audio", label: "Audio Speakers", icon: Speaker },
  { handle: "wireless-chargers", label: "Wireless Chargers", icon: Plug },
  { handle: "bags", label: "Bags", icon: BriefcaseBusiness },
];

/** Brand navigation, mapped to Shopify collection handles. */
export const BRANDS: CatalogEntry[] = [
  { handle: "apple", label: "Apple" },
  { handle: "samsung", label: "Samsung" },
  { handle: "google", label: "Google" },
  { handle: "xiaomi", label: "Xiaomi" },
  { handle: "oneplus", label: "OnePlus" },
  { handle: "honor", label: "Honor" },
  { handle: "oppo", label: "Oppo" },
  { handle: "realme", label: "Realme" },
];

/** Primary header navigation groups. */
export const NAV_GROUPS: Array<{ label: string; handle?: string; children?: CatalogEntry[] }> = [
  { label: "Smartphones", handle: "smartphones", children: BRANDS },
  { label: "Tablets", handle: "tablets" },
  {
    label: "Accessories",
    handle: "accessories",
    children: CATEGORIES.filter((category) =>
      ["cases", "chargers", "power-banks", "wireless-chargers", "bags"].includes(category.handle),
    ),
  },
  {
    label: "Audio",
    handle: "audio",
    children: CATEGORIES.filter((category) => ["earbuds", "audio"].includes(category.handle)),
  },
  { label: "Deals", handle: "deals" },
];

/** Keeps only the entries that exist as real collections in the connected store. */
export function availableEntries(entries: CatalogEntry[], handles: Set<string>) {
  return entries.filter((entry) => handles.has(entry.handle));
}
