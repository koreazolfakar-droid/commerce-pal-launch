/**
 * Dynamic brand directory sourced from Shopify.
 *
 * Shopify Metaobjects would be the ideal source, but this storefront token only
 * carries the public product-listing scopes — `metaobjects` returns
 * ACCESS_DENIED (`unauthenticated_read_metaobjects` required). The best
 * dynamic Shopify source available is therefore collections: a collection whose
 * handle/title matches a brand present in the live catalogue supplies that
 * brand's logo image, display name and ordering.
 *
 * Nothing here is hardcoded per brand: adding a brand collection (with an
 * image) in Shopify makes it appear in Top Brands with no code change.
 */

import type { ShopifyCollection } from "@/lib/shopify";
import { slugify, type CatalogFacet } from "@/lib/taxonomy";

export interface ShopifyBrand extends CatalogFacet {
  /** Logo/image served straight from Shopify, when the collection has one. */
  image?: string;
  imageAlt?: string;
  /** Matching Shopify collection handle, when one exists. */
  collectionHandle?: string;
}

/**
 * Merges the brands detected in the live catalogue with any matching Shopify
 * collection, so logos and names come from Shopify itself. Brands without a
 * matching collection stay in the list and fall back to the resolved logo /
 * monogram, so the section never breaks and never shows invented data.
 */
/** Collapses a handle/title to bare letters+digits, dropping generic words. */
function normalizeKey(value: string) {
  return slugify(value)
    .replace(/-(official|store|brand|collection|products|shop)$/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function buildShopifyBrands(
  brands: CatalogFacet[],
  collections: ShopifyCollection[] | undefined,
): ShopifyBrand[] {
  const withImage: Array<{ key: string; collection: ShopifyCollection }> = [];
  const byKey = new Map<string, ShopifyCollection>();
  for (const collection of collections ?? []) {
    for (const key of [normalizeKey(collection.handle), normalizeKey(collection.title)]) {
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, collection);
      if (collection.image?.url) withImage.push({ key, collection });
    }
  }

  return brands.map((brand) => {
    const key = normalizeKey(brand.slug);
    // Prefer any collection that actually carries an image (exact key, then a
    // handle/title that contains the brand name, e.g. "anker-official").
    const collection =
      withImage.find((entry) => entry.key === key)?.collection ??
      withImage.find((entry) => entry.key.includes(key) || key.includes(entry.key))?.collection ??
      byKey.get(key);
    const entry: ShopifyBrand = {
      ...brand,
      label: collection?.title?.trim() || brand.label,
    };
    if (collection?.image?.url) entry.image = collection.image.url;
    if (collection?.image?.altText) entry.imageAlt = collection.image.altText;
    if (collection?.handle) entry.collectionHandle = collection.handle;
    return entry;
  });
}
