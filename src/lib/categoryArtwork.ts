import type { ShopifyCollection } from "@/lib/shopify";

const CATEGORY_COLLECTION_ALIASES: Record<string, string[]> = {
  smartphones: ["phones", "mobile-phones"],
  smartwatches: ["watches"],
  headphones: ["headphones-earbuds"],
  audio: ["speakers"],
  cables: ["charging-cables"],
  cases: ["phone-cases", "cases-protection"],
  "tv-displays": ["tvs", "displays"],
  "computer-accessories": ["keyboards-mice", "computer-accessories"],
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves the Shopify Collection that owns artwork for a storefront category.
 *
 * Priority:
 * 1. `hero-category-{slug}` for an explicit artwork-only override.
 * 2. A normal Collection whose handle exactly matches the category slug.
 * 3. A Collection whose title exactly matches the localized/default category label.
 * 4. A small set of safe handle aliases for existing merchant collections.
 *
 * Only collections with an image are returned. This lets the UI keep the
 * built-in CategoryGlyph as a zero-config fallback.
 */
export function findCategoryArtworkCollection(
  collections: ShopifyCollection[],
  slug: string,
  label?: string,
): ShopifyCollection | undefined {
  const normalizedSlug = normalize(slug);
  const normalizedLabel = label ? normalize(label) : "";
  const preferredHandles = [
    `hero-category-${normalizedSlug}`,
    normalizedSlug,
    ...(CATEGORY_COLLECTION_ALIASES[normalizedSlug] ?? []),
  ];

  for (const handle of preferredHandles) {
    const match = collections.find(
      (collection) => normalize(collection.handle) === handle && Boolean(collection.image?.url),
    );
    if (match) return match;
  }

  if (normalizedLabel) {
    const titleMatch = collections.find(
      (collection) =>
        normalize(collection.title) === normalizedLabel && Boolean(collection.image?.url),
    );
    if (titleMatch) return titleMatch;
  }

  return undefined;
}
