import type { ShopifyCollection } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";
import { orderedBrands } from "@/lib/homeMerchandising";

export interface ShopifyBrand extends CatalogFacet {
  image?: string;
  imageAlt?: string;
  collectionHandle?: string;
}

/** Separate logo collections prevent campaign photography from replacing a company mark. */
export function buildShopifyBrands(
  brands: CatalogFacet[],
  collections: ShopifyCollection[] | undefined,
): ShopifyBrand[] {
  return orderedBrands(brands).map((brand) => {
    const collection = [`logo-${brand.slug}`, `brand-logo-${brand.slug}`]
      .map((handle) => collections?.find((item) => item.handle === handle && item.image?.url))
      .find(Boolean);
    const entry: ShopifyBrand = { ...brand };
    if (collection?.image) {
      entry.image = collection.image.url;
      if (collection.image.altText) entry.imageAlt = collection.image.altText;
      entry.collectionHandle = collection.handle;
    }
    return entry;
  });
}
