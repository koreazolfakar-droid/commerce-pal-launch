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
 * Homepage hero tabs are driven by Shopify collections.
 * Preferred handles can use home-hero-*, hero-home-*, or the merchant-friendly hero-* naming.
 * Facet-specific hero-brand-* / hero-category-* collections remain legacy fallbacks.
 * If the merchant has not created dedicated hero collections yet, use normal customer-facing
 * collections instead so the homepage hero never disappears completely.
 */
export function homeHeroCollections(collections: ShopifyCollection[]): ShopifyCollection[] {
  const dedicated = collections.filter((collection) =>
    /^(home-hero-|hero-home-|hero-(?!brand-|category-))/.test(collection.handle),
  );
  const legacy = collections.filter((collection) => /^(hero-brand-|hero-category-)/.test(collection.handle));
  const customerFacing = collections.filter(
    (collection) => !isMerchandisingCollection(collection.handle),
  );

  const source = dedicated.length
    ? dedicated
    : legacy.length
      ? legacy
      : customerFacing.length
        ? customerFacing
        : collections;

  return [...source]
    .sort((a, b) => {
      const imageRank = Number(Boolean(b.image)) - Number(Boolean(a.image));
      return imageRank || a.title.localeCompare(b.title);
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
