import type { CmsBrand } from "@/lib/cms";
import type { StoreCollection } from "@/lib/storeTypes";
import type { CatalogFacet } from "@/lib/taxonomy";
import { slugify } from "@/lib/taxonomy";
import { orderedBrands } from "@/lib/homeMerchandising";
import { STORE_NAME } from "@/lib/storeConfig";

export interface StoreBrand extends CatalogFacet {
  image?: string;
  imageAlt?: string;
  collectionHandle?: string;
  href?: string;
}

const GENERIC_VENDOR_LABELS = new Set([
  STORE_NAME.toLowerCase(),
  STORE_NAME.toLowerCase().replace(/\s+/g, ""),
  "default",
  "generic",
  "unknown",
]);

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

function looksLikeLogoImage(collection: StoreCollection) {
  const image = collection.image;
  if (!image?.url) return false;
  const evidence = `${image.altText ?? ""} ${image.url}`.toLowerCase();
  return /(?:^|[\s_\-/.])logo(?:[\s_\-/.]|$)/.test(evidence);
}

function compactBrandIdentity(value: string) {
  return slugify(value).replace(/-/g, "");
}

function dedicatedCollectionBrandIdentity(handle: string) {
  const withoutPrefix = handle.replace(/^(?:brand-logo-|logo-)/, "");
  return compactBrandIdentity(withoutPrefix);
}

export function buildStoreBrands(
  brands: CatalogFacet[],
  collections: StoreCollection[] | undefined,
): StoreBrand[] {
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
    const exact = exactCandidates.find(looksLikeLogoImage);

    // A normal brand collection often uses a product/lifestyle cover. Never pass
    // that artwork into the logo rail: if no explicit/logo-like image exists,
    // BrandLogo falls back to the curated local wordmark instead.
    const collection = dedicated ?? exact;
    const entry: StoreBrand = { ...brand };
    if (collection?.image) {
      entry.image = collection.image.url;
      if (collection.image.altText) entry.imageAlt = collection.image.altText;
      entry.collectionHandle = collection.handle;
    }
    return entry;
  });
}

/**
 * Dashboard brand rows are an override layer on top of storefront vendors.
 * Matching slugs can rename, hide, reorder, relink or replace the logo of a
 * storefront brand. CMS-only rows are also allowed for campaign/landing links.
 */
export function applyCmsBrands(storeBrands: StoreBrand[], cmsBrands: CmsBrand[]): StoreBrand[] {
  if (!cmsBrands.length) return storeBrands;

  const managed = new Map(cmsBrands.map((brand) => [brand.slug, brand]));
  const result: Array<StoreBrand & { __cmsOrder?: number }> = [];
  const seen = new Set<string>();

  for (const brand of storeBrands) {
    const override = managed.get(brand.slug);
    seen.add(brand.slug);
    if (override && !override.is_visible) continue;

    result.push({
      ...brand,
      ...(override?.name?.trim() ? { label: override.name.trim() } : {}),
      ...(override?.logo_url?.trim() ? { image: override.logo_url.trim() } : {}),
      ...(override?.href?.trim() ? { href: override.href.trim() } : {}),
      ...(override ? { __cmsOrder: override.sort_order } : {}),
    });
  }

  for (const brand of cmsBrands) {
    if (seen.has(brand.slug) || !brand.is_visible) continue;
    result.push({
      slug: brand.slug,
      label: brand.name,
      count: 0,
      ...(brand.logo_url ? { image: brand.logo_url } : {}),
      ...(brand.href ? { href: brand.href } : {}),
      __cmsOrder: brand.sort_order,
    });
  }

  return result
    .map((brand, index) => ({ brand, index }))
    .sort((a, b) => {
      const aOrder = a.brand.__cmsOrder;
      const bOrder = b.brand.__cmsOrder;
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== undefined && bOrder === undefined) return -1;
      if (aOrder === undefined && bOrder !== undefined) return 1;
      return a.index - b.index;
    })
    .map(({ brand }) => {
      const { __cmsOrder: _cmsOrder, ...clean } = brand;
      return clean;
    });
}
