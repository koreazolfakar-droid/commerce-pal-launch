/**
 * Canonical storefront category slugs.
 *
 * These aliases mirror the category families normalized by the Supabase
 * category cleanup migration and the active production category rows.
 * Keeping them in one shared helper prevents duplicate taxonomy URLs from
 * leaking through navigation, breadcrumbs and sitemaps.
 */
export const CATEGORY_SLUG_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  "mobile-phones": "smartphone",
  "foldable-smartphone": "smartphone",
  "smartphone-bundle": "smartphone",
  smartphones: "smartphone",
  "gaming-tablet": "tablet",
  tablets: "tablet",
  "wall-charger": "charger",
  chargers: "charger",
  "charging-cable": "cable",
  cables: "cable",
  smartwatches: "smart-watch",
  headphones: "wireless-earbuds",
  "power-banks": "power-bank",
  "used-phones": "used-phone",
  "هاتف-مستعمل": "used-phone",
});

export function canonicalCategorySlug(slug: string) {
  return CATEGORY_SLUG_REDIRECTS[slug] ?? slug;
}

export function isCanonicalCategorySlug(slug: string) {
  return canonicalCategorySlug(slug) === slug;
}
