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
export function buildShopifyBrands(
  brands: CatalogFacet[],
  collections: ShopifyCollection[] | undefined,
): ShopifyBrand[] {
  const bySlug = new Map<string, ShopifyCollection>();
  for (const collection of collections ?? []) {
    bySlug.set(collection.handle.toLowerCase(), collection);
    const titleSlug = slugify(collection.title);
    if (titleSlug && !bySlug.has(titleSlug)) bySlug.set(titleSlug, collection);
  }

  return brands.map((brand) => {
    const collection = bySlug.get(brand.slug);
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
