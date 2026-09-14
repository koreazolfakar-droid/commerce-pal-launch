import type { ShopifyCollection } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";

/** Exact merchandising handles only; these collections are configuration, not normal catalogue navigation. */
export function findFacetMerchandising(
  collections: ShopifyCollection[],
  kind: "brand" | "category",
  slug: string,
): ShopifyCollection | undefined {
  const handles =
    kind === "brand" ? [`hero-brand-${slug}`, `showcase-${slug}`] : [`hero-category-${slug}`];
  return handles.map((handle) => collections.find((item) => item.handle === handle)).find(Boolean);
}

/**
 * Dedicated homepage hero collections are artwork configuration only.
 * Their collection image is used directly; catalogue product images are never a fallback.
 */
export function homepageHeroCollections(collections: ShopifyCollection[]): ShopifyCollection[] {
  return collections
    .filter(
      (collection) =>
        Boolean(collection.image?.url) &&
        /^(homepage-hero$|home-hero-|hero-home-|hero-slide-|hero-(?!brand-|category-))/.test(
          collection.handle,
        ),
    )
    .sort((a, b) => {
      const primaryRank =
        Number(a.handle !== "homepage-hero") - Number(b.handle !== "homepage-hero");
      return primaryRank || a.handle.localeCompare(b.handle);
    })
    .slice(0, 10);
}

/**
 * Storefront merchandising priority. Keep the most recognizable global
 * electronics companies first, followed by strong accessory/mobile brands.
 * Unknown Shopify vendors remain supported and fall back to alphabetical order.
 */
const BRAND_PRIORITY_GROUPS = [
  ["apple"],
  ["samsung"],
  ["xiaomi"],
  ["sony"],
  ["anker"],
  ["huawei"],
  ["lenovo"],
  ["asus"],
  ["hp"],
  ["dell"],
  ["jbl"],
  ["bose"],
  ["google"],
  ["oneplus", "one-plus"],
  ["honor"],
  ["oppo"],
  ["vivo"],
  ["realme"],
  ["logitech"],
  ["ugreen"],
  ["belkin"],
  ["baseus"],
  ["poco"],
  ["redmi"],
  ["nothing"],
  ["motorola"],
  ["nokia"],
  ["tecno"],
  ["infinix"],
  ["acefast"],
  ["vention"],
  ["wiwu"],
  ["blackshark", "black-shark"],
  ["redmagic", "red-magic"],
  ["spigen"],
] as const;

const BRAND_PRIORITY = new Map<string, number>();
for (const [rank, aliases] of BRAND_PRIORITY_GROUPS.entries()) {
  for (const alias of aliases) BRAND_PRIORITY.set(alias, rank);
}

export function orderedBrands<T extends CatalogFacet>(brands: T[]): T[] {
  const fallbackRank = BRAND_PRIORITY_GROUPS.length;
  return [...brands].sort((a, b) => {
    const rankA = BRAND_PRIORITY.get(a.slug) ?? fallbackRank;
    const rankB = BRAND_PRIORITY.get(b.slug) ?? fallbackRank;
    return rankA - rankB || a.label.localeCompare(b.label);
  });
}

/** Configuration collections stay out of navigation and customer-facing filters. */
export function isMerchandisingCollection(handle: string): boolean {
  return /^(homepage-hero$|home-hero-|hero-home-|hero-(?!brand-|category-)|hero-brand-|hero-category-|logo-|brand-logo-)/.test(
    handle,
  );
}
