import type { ShopifyCollection } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";
import { slugify } from "@/lib/taxonomy";
import { orderedBrands } from "@/lib/homeMerchandising";
import { STORE_NAME } from "@/lib/storeConfig";

export interface ShopifyBrand extends CatalogFacet {
  image?: string;
  imageAlt?: string;
  collectionHandle?: string;
}

const GENERIC_VENDOR_LABELS = new Set([
  STORE_NAME.toLowerCase(),
  STORE_NAME.toLowerCase().replace(/\s+/g, ""),
  "default",
  "generic",
  "unknown",
]);

/**
 * Extend the bounded catalogue brand index with every explicit Shopify vendor.
 * The vendor discovery query is intentionally tiny (vendor only), so brands from
 * products outside the homepage's first catalogue page still appear without
 * making the homepage fetch every product card payload.
 */
export function mergeVendorBrands(brands: CatalogFacet[], vendors: string[]): CatalogFacet[] {
  const merged = new Map(brands.map((brand) => [brand.slug, { ...brand }]));

  for (const rawVendor of vendors) {
    const label = rawVendor.trim();
    if (!label) continue;
    const normalized = label.toLowerCase();
    if (GENERIC_VENDOR_LABELS.has(normalized)) continue;

    const slug = slugify(label);
    if (!slug || merged.has(slug)) continue;
    merged.set(slug, { slug, label, count: 1 });
  }

  return orderedBrands([...merged.values()]);
}

function looksLikeLogoImage(collection: ShopifyCollection) {
  const image = collection.image;
  if (!image?.url) return false;
  const evidence = `${image.altText ?? ""} ${image.url}`.toLowerCase();
  return /(?:^|[\s_\-/.])logo(?:[\s_\-/.]|$)/.test(evidence);
}

/**
 * Resolve a merchant logo in priority order:
 * 1) dedicated `logo-*` / `brand-logo-*` collections;
 * 2) an exact brand collection whose image is clearly a logo.
 *
 * This keeps campaign photography from replacing a company mark while allowing
 * normal Shopify brand collections such as `acefast` + `acefast-logo.jpg` to
 * populate the Brands UI automatically.
 */
export function buildShopifyBrands(
  brands: CatalogFacet[],
  collections: ShopifyCollection[] | undefined,
): ShopifyBrand[] {
  return orderedBrands(brands).map((brand) => {
    const dedicated = [`logo-${brand.slug}`, `brand-logo-${brand.slug}`]
      .map((handle) => collections?.find((item) => item.handle === handle && item.image?.url))
      .find(Boolean);

    const exact = collections?.find(
      (item) =>
        Boolean(item.image?.url) &&
        (item.handle === brand.slug || slugify(item.title) === brand.slug) &&
        looksLikeLogoImage(item),
    );

    const collection = dedicated ?? exact;
    const entry: ShopifyBrand = { ...brand };
    if (collection?.image) {
      entry.image = collection.image.url;
      if (collection.image.altText) entry.imageAlt = collection.image.altText;
      entry.collectionHandle = collection.handle;
    }
    return entry;
  });
}
