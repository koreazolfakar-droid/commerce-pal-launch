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
      const primaryRank = Number(a.handle !== "homepage-hero") - Number(b.handle !== "homepage-hero");
      return primaryRank || a.handle.localeCompare(b.handle);
    })
    .slice(0, 10);
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
  return /^(homepage-hero$|home-hero-|hero-home-|hero-(?!brand-|category-)|hero-brand-|hero-category-|logo-|brand-logo-)/.test(
    handle,
  );
}
