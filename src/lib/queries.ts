import { fetchShopPolicies } from "@/lib/policies";
import { fetchShowcaseCollections } from "@/lib/merchandising";
import { queryOptions } from "@tanstack/react-query";

import { mergeVendorBrands } from "@/lib/brandDirectory";
import {
  fetchAllProductsByVendor,
  fetchBrandVendors,
  fetchCatalogProducts,
  fetchBestSellingProducts,
  fetchProducts,
  fetchCollectionByHandle,
  fetchCollections,
  fetchProductByHandle,
  fetchProductRecommendations,
  fetchProductsByHandles,
  fetchProductsByVendor,
  searchStorefront,
} from "@/lib/hybridStore";
import { buildCatalogIndex } from "@/lib/taxonomy";

const CATALOG_STALE_TIME = 2 * 60 * 1000;
const BRAND_COLLECTION_STALE_TIME = 60 * 1000;
const MERCHANDISING_STALE_TIME = 10 * 60 * 1000;
const POLICY_STALE_TIME = 30 * 60 * 1000;

async function fetchCatalogIndexSafely() {
  try {
    const vendorPromise = fetchBrandVendors().catch((error) => {
      console.error(
        "Storefront vendor discovery failed; using brands from the bounded catalog.",
        error,
      );
      return [] as string[];
    });
    const [products, vendors] = await Promise.all([fetchCatalogProducts(60), vendorPromise]);
    const catalog = buildCatalogIndex(products);
    return {
      ...catalog,
      brands: vendors.length ? mergeVendorBrands(catalog.brands, vendors) : catalog.brands,
    };
  } catch (error) {
    console.error(
      "Storefront catalog fetch failed; rendering the update state instead of the global error page.",
      error,
    );
    return buildCatalogIndex([]);
  }
}

/** Bounded discovery index. Route-specific product data uses dedicated queries. */
export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "catalog"],
    queryFn: fetchCatalogIndexSafely,
    staleTime: CATALOG_STALE_TIME,
  });

export const collectionsQueryOptions = () =>
  queryOptions({
    // Keep collection/brand artwork fresh while preserving the established cache key.
    queryKey: ["shopify", "collections", "brand-logo-cache-v5", 100],
    queryFn: () => fetchCollections(100),
    staleTime: BRAND_COLLECTION_STALE_TIME,
  });

export const bestSellingQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "best-selling"],
    queryFn: () => fetchBestSellingProducts(12),
    staleTime: CATALOG_STALE_TIME,
  });

export const collectionQueryOptions = (handle: string, pageSize = 48) =>
  queryOptions({
    queryKey: ["shopify", "collection", handle, pageSize],
    queryFn: () => fetchCollectionByHandle(handle, pageSize),
    staleTime: CATALOG_STALE_TIME,
  });

/** Creation order across both storefront sources. */
export const newestQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "newest"],
    queryFn: () => fetchProducts(12, undefined, "CREATED_AT", true),
    staleTime: CATALOG_STALE_TIME,
  });

export const productQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["shopify", "product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: CATALOG_STALE_TIME,
  });

/** Recommendations can now include both native Space Call and Shopify products. */
export const recommendationsQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["shopify", "recommendations", handle],
    queryFn: () => fetchProductRecommendations(handle),
    staleTime: CATALOG_STALE_TIME,
  });

export const vendorProductsQueryOptions = (vendor: string) =>
  queryOptions({
    queryKey: ["shopify", "vendor-products", vendor],
    queryFn: () => fetchProductsByVendor(vendor, 9),
    enabled: Boolean(vendor.trim()),
    staleTime: CATALOG_STALE_TIME,
  });

/**
 * Small homepage-only vendor payload. The hybrid layer keeps this bounded and
 * can backfill a brand shelf from either storefront source.
 */
export const homeVendorProductsQueryOptions = (vendor: string) => {
  const normalizedVendor = vendor.trim();
  return queryOptions({
    queryKey: ["shopify", "home-vendor-products", normalizedVendor],
    queryFn: () => fetchProductsByVendor(normalizedVendor, 4),
    enabled: Boolean(normalizedVendor),
    staleTime: CATALOG_STALE_TIME,
  });
};

/** Complete product list for a brand page; fetched only when that route is opened. */
export const allVendorProductsQueryOptions = (vendor: string) =>
  queryOptions({
    queryKey: ["shopify", "vendor-products-all", vendor],
    queryFn: () => fetchAllProductsByVendor(vendor),
    enabled: Boolean(vendor.trim()),
    staleTime: CATALOG_STALE_TIME,
  });

export const productsByHandlesQueryOptions = (handles: string[]) => {
  const normalized = [...new Set(handles)].sort();
  return queryOptions({
    queryKey: ["shopify", "products-by-handles", normalized],
    queryFn: () => fetchProductsByHandles(normalized),
    enabled: normalized.length > 0,
    staleTime: 60 * 1000,
  });
};

export const storefrontSearchQueryOptions = (term: string) =>
  queryOptions({
    queryKey: ["shopify", "search", term.trim()],
    queryFn: () => searchStorefront(term),
    enabled: Boolean(term.trim()),
    staleTime: 60 * 1000,
  });

export const shopPoliciesQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "policies"],
    queryFn: () => fetchShopPolicies(),
    staleTime: POLICY_STALE_TIME,
    retry: false,
  });

export const showcaseCollectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["showcase-collections"],
    queryFn: fetchShowcaseCollections,
    staleTime: MERCHANDISING_STALE_TIME,
    retry: false,
  });
