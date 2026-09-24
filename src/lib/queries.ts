import { fetchShopPolicies } from "@/lib/policies";
import { fetchShowcaseCollections } from "@/lib/merchandising";
import { queryOptions } from "@tanstack/react-query";

import { mergeVendorBrands } from "@/lib/brandDirectory";
import {
  fetchAllProductsByVendor,
  fetchBestSellingProducts,
  fetchBrandVendors,
  fetchCatalogProducts,
  fetchCollectionByHandle,
  fetchCollections,
  fetchHomepageProducts,
  fetchNewestProducts,
  fetchNavigationCatalogFacets,
  fetchProductByHandle,
  fetchProductRecommendations,
  fetchProductsByHandles,
  fetchProductsByVendor,
  searchStorefront,
} from "@/lib/storefrontData";
import type { StoreProduct } from "@/lib/storeTypes";
import { buildCatalogIndex } from "@/lib/taxonomy";

const CATALOG_STALE_TIME = 60 * 1000;
const BRAND_COLLECTION_STALE_TIME = 60 * 1000;
const MERCHANDISING_STALE_TIME = 60 * 1000;
const POLICY_STALE_TIME = 30 * 60 * 1000;
const NAVIGATION_FACETS_STALE_TIME = 5 * 60 * 1000;
const CATALOG_REFRESH_FALLBACK_TTL_MS = 5 * 60 * 1000;
const CATALOG_REFRESH_FALLBACK_STORAGE_KEY = "space-call-supabase-catalog-fallback-v1";
const QUERY_RETRY_COUNT = 2;

const retryDelay = (attemptIndex: number) => Math.min(300 * 2 ** attemptIndex, 1_500);

type CatalogRefreshFallback = {
  cachedAt: number;
  products: StoreProduct[];
  vendors: string[];
};

function buildCatalogFromSource(products: StoreProduct[], vendors: string[]) {
  const catalog = buildCatalogIndex(products);
  return {
    ...catalog,
    brands: vendors.length ? mergeVendorBrands(catalog.brands, vendors) : catalog.brands,
  };
}

function readCatalogRefreshFallback(): CatalogRefreshFallback | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CATALOG_REFRESH_FALLBACK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CatalogRefreshFallback>;
    const valid =
      typeof parsed.cachedAt === "number" &&
      Array.isArray(parsed.products) &&
      Array.isArray(parsed.vendors) &&
      parsed.vendors.every((vendor) => typeof vendor === "string");
    if (!valid || Date.now() - parsed.cachedAt! >= CATALOG_REFRESH_FALLBACK_TTL_MS) {
      window.sessionStorage.removeItem(CATALOG_REFRESH_FALLBACK_STORAGE_KEY);
      return null;
    }
    return parsed as CatalogRefreshFallback;
  } catch {
    return null;
  }
}

function writeCatalogRefreshFallback(products: StoreProduct[], vendors: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CATALOG_REFRESH_FALLBACK_STORAGE_KEY,
      JSON.stringify({ cachedAt: Date.now(), products, vendors } satisfies CatalogRefreshFallback),
    );
  } catch {
    // Session storage is optional; Supabase remains the source of truth.
  }
}

async function fetchHomepageCatalogIndex() {
  // Navigation facets are already loaded through navigationCatalogQueryOptions
  // by the global header. Keeping them out of this query avoids four duplicate
  // Supabase reads before homepage product rails can render.
  const products = await fetchHomepageProducts(48);
  return buildCatalogIndex(products);
}

async function fetchCatalogIndexSafely() {
  try {
    const [products, vendors] = await Promise.all([
      fetchCatalogProducts(500),
      fetchBrandVendors(),
    ]);
    writeCatalogRefreshFallback(products, vendors);
    return buildCatalogFromSource(products, vendors);
  } catch (error) {
    const fallback = readCatalogRefreshFallback();
    if (fallback) {
      console.warn("Supabase catalog refresh failed; keeping the last successful tab snapshot.", error);
      return buildCatalogFromSource(fallback.products, fallback.vendors);
    }
    console.error("Supabase catalog fetch failed.", error);
    throw error;
  }
}

/** Complete active Space Call catalogue sourced from Supabase. */
export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "catalog"],
    queryFn: fetchCatalogIndexSafely,
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const homepageCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "homepage-catalog"],
    queryFn: fetchHomepageCatalogIndex,
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const collectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "collections"],
    queryFn: () => fetchCollections(500),
    staleTime: BRAND_COLLECTION_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const navigationCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "navigation-facets"],
    queryFn: fetchNavigationCatalogFacets,
    staleTime: NAVIGATION_FACETS_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const bestSellingQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "best-selling"],
    queryFn: () => fetchBestSellingProducts(12),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const collectionQueryOptions = (handle: string, pageSize = 48) =>
  queryOptions({
    queryKey: ["supabase", "collection", handle, pageSize],
    queryFn: () => fetchCollectionByHandle(handle, pageSize),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const newestQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "newest"],
    queryFn: () => fetchNewestProducts(12),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const productQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["supabase", "product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const recommendationsQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["supabase", "recommendations", handle],
    queryFn: () => fetchProductRecommendations(handle),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const vendorProductsQueryOptions = (vendor: string) =>
  queryOptions({
    queryKey: ["supabase", "vendor-products", vendor],
    queryFn: () => fetchProductsByVendor(vendor, 9),
    enabled: Boolean(vendor.trim()),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const homeVendorProductsQueryOptions = (vendor: string) => {
  const normalizedVendor = vendor.trim();
  return queryOptions({
    queryKey: ["supabase", "home-vendor-products", normalizedVendor],
    queryFn: () => fetchProductsByVendor(normalizedVendor, 6),
    enabled: Boolean(normalizedVendor),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });
};

export const allVendorProductsQueryOptions = (vendor: string) =>
  queryOptions({
    queryKey: ["supabase", "vendor-products-all", vendor],
    queryFn: () => fetchAllProductsByVendor(vendor),
    enabled: Boolean(vendor.trim()),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

export const productsByHandlesQueryOptions = (handles: string[]) => {
  const normalized = [...new Set(handles)].sort();
  return queryOptions({
    queryKey: ["supabase", "products-by-handles", normalized],
    queryFn: () => fetchProductsByHandles(normalized),
    enabled: normalized.length > 0,
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });
};

export const storefrontSearchQueryOptions = (term: string) =>
  queryOptions({
    queryKey: ["supabase", "search", term.trim()],
    queryFn: () => searchStorefront(term),
    enabled: Boolean(term.trim()),
    staleTime: CATALOG_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });

/** Detailed policies are read from the native Supabase CMS when configured. */
export const shopPoliciesQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "policies"],
    queryFn: () => fetchShopPolicies(),
    staleTime: POLICY_STALE_TIME,
    retry: false,
  });

export const showcaseCollectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["supabase", "showcase-collections"],
    queryFn: fetchShowcaseCollections,
    staleTime: MERCHANDISING_STALE_TIME,
    retry: QUERY_RETRY_COUNT,
    retryDelay,
  });
