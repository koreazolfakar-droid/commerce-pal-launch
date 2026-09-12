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
 * Homepage hero tabs are driven entirely by Shopify collections.
 * Preferred handles: home-hero-01-apple, home-hero-02-xiaomi, ...
 * Legacy hero-brand-* / hero-category-* collections are used only until a dedicated home-hero-* set exists.
 */
export function homeHeroCollections(collections: ShopifyCollection[]): ShopifyCollection[] {
  const dedicated = collections.filter((collection) => /^(home-hero-|hero-home-)/.test(collection.handle));
  const legacy = collections.filter((collection) => /^(hero-brand-|hero-category-)/.test(collection.handle));
  const source = dedicated.length ? dedicated : legacy;
  return [...source].sort((a, b) => a.handle.localeCompare(b.handle)).slice(0, 10);
}

export function orderedBrands<T extends CatalogFacet>(brands: T[]): T[] {
  const priority = ["apple", "samsung", "xiaomi"];
  const rank = (slug: string) => {
    const index = priority.indexOf(slug);
    return index === -1 ? priority.length : index;
  };
  return [...brands].sort((a, b) => rank(a.slug) - rank(b.slug) || a.label.localeCompare(b.label));
}

/** Configuration collections stay out of navigation and customer-facing filters. */
export function isMerchandisingCollection(handle: string): boolean {
  return /^(homepage-hero$|home-hero-|hero-home-|hero-brand-|hero-category-|logo-|brand-logo-)/.test(
    handle,
  );
}
