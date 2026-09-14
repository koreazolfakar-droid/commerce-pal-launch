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
 * Treat separators as presentation-only so common Shopify naming variations
 * resolve to the same brand. Examples: `UGREEN`, `U Green`, and `u-green`.
 */
function compactBrandIdentity(value: string) {
  return slugify(value).replace(/-/g, "");
}

function dedicatedCollectionBrandIdentity(handle: string) {
  const withoutPrefix = handle.replace(/^(?:brand-logo-|logo-)/, "");
  return compactBrandIdentity(withoutPrefix);
}

/**
 * Resolve a merchant logo in priority order:
 * 1) dedicated `logo-*` / `brand-logo-*` collections;
 * 2) an exact brand collection, preferring artwork explicitly named as a logo.
 *
 * Exact matching is separator-insensitive, so a vendor like `UGREEN` can use a
 * Shopify collection such as `u-green` or `logo-u-green`. The exact collection
 * image is merchant-controlled and is therefore accepted even when its file
 * name or alt text does not contain the word "logo".
 */
export function buildShopifyBrands(
  brands: CatalogFacet[],
  collections: ShopifyCollection[] | undefined,
): ShopifyBrand[] {
  return orderedBrands(brands).map((brand) => {
    const brandIdentity = compactBrandIdentity(brand.slug || brand.label);
    const availableCollections = collections ?? [];

    const dedicated = availableCollections.find(
      (item) =>
        Boolean(item.image?.url) &&
        /^(?:brand-logo-|logo-)/.test(item.handle) &&
        dedicatedCollectionBrandIdentity(item.handle) === brandIdentity,
    );

    const exactCandidates = availableCollections.filter(
      (item) =>
        Boolean(item.image?.url) &&
        (compactBrandIdentity(item.handle) === brandIdentity ||
          compactBrandIdentity(item.title) === brandIdentity),
    );
    const exact = exactCandidates.find(looksLikeLogoImage) ?? exactCandidates[0];

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
