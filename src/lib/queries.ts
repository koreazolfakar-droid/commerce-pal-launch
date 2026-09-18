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
  type StoreProduct,
} from "@/lib/storefrontFacade";
import { buildCatalogIndex } from "@/lib/taxonomy";

const CATALOG_STALE_TIME = 2 * 60 * 1000;
const BRAND_COLLECTION_STALE_TIME = 60 * 1000;
const MERCHANDISING_STALE_TIME = 10 * 60 * 1000;
const POLICY_STALE_TIME = 30 * 60 * 1000;
const CATALOG_REFRESH_FALLBACK_TTL_MS = 5 * 60 * 1000;
const CATALOG_REFRESH_FALLBACK_STORAGE_KEY = "space-call-catalog-refresh-fallback-v1";
const STOREFRONT_QUERY_RETRY_COUNT = 3;

const storefrontRetryDelay = (attemptIndex: number) => Math.min(300 * 2 ** attemptIndex, 2_000);

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
    const snapshot: CatalogRefreshFallback = {
      cachedAt: Date.now(),
      products,
      vendors,
    };
    window.sessionStorage.setItem(CATALOG_REFRESH_FALLBACK_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

async function fetchCatalogIndexSafely() {
  try {
    const vendorPromise = fetchBrandVendors().catch((error) => {
      console.error(
        "Storefront brand discovery failed; using brands from the bounded catalog.",
        error,
      );
      return [] as string[];
    });
    const [products, vendors] = await Promise.all([fetchCatalogProducts(60), vendorPromise]);
    writeCatalogRefreshFallback(products, vendors);
    return buildCatalogFromSource(products, vendors);
  } catch (error) {
    const fallback = readCatalogRefreshFallback();
    if (fallback) {
      console.warn(
        "Storefront catalog refresh failed; keeping the last successful catalog for this tab.",
        error,
      );
      return buildCatalogFromSource(fallback.products, fallback.vendors);
    }

    console.error(
      "Storefront catalog fetch failed; allowing React Query to retry instead of caching an empty catalog.",
      error,
    );
    throw error;
  }
}

/** Bounded storefront discovery index. Route-specific product data uses dedicated queries. */
export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "catalog"],
    queryFn: fetchCatalogIndexSafely,
    meta: { ssrSerializable: false },
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const collectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "collections", "brand-logo-cache-v5", 100],
    queryFn: () => fetchCollections(100),
    staleTime: BRAND_COLLECTION_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const bestSellingQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "best-selling"],
    queryFn: () => fetchBestSellingProducts(12),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const collectionQueryOptions = (handle: string, pageSize = 48) =>
  queryOptions({
    queryKey: ["storefront", "collection", handle, pageSize],
    queryFn: () => fetchCollectionByHandle(handle, pageSize),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

/** Storefront creation order. */
export const newestQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "newest"],
    queryFn: () => fetchProducts(12, undefined, "CREATED_AT", true),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const productQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["storefront", "product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const recommendationsQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["storefront", "recommendations", handle],
    queryFn: () => fetchProductRecommendations(handle),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const vendorProductsQueryOptions = (vendor: string) =>
  queryOptions({
    queryKey: ["storefront", "vendor-products", vendor],
    queryFn: () => fetchProductsByVendor(vendor, 9),
    enabled: Boolean(vendor.trim()),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

/** Small homepage-only brand payload. */
export const homeVendorProductsQueryOptions = (vendor: string) => {
  const normalizedVendor = vendor.trim();
  return queryOptions({
    queryKey: ["storefront", "home-vendor-products", normalizedVendor],
    queryFn: () => fetchProductsByVendor(normalizedVendor, 4),
    enabled: Boolean(normalizedVendor),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });
};

/** Complete storefront product list for a brand page; fetched only when that route is opened. */
export const allVendorProductsQueryOptions = (vendor: string) =>
  queryOptions({
    queryKey: ["storefront", "vendor-products-all", vendor],
    queryFn: () => fetchAllProductsByVendor(vendor),
    enabled: Boolean(vendor.trim()),
    staleTime: CATALOG_STALE_TIME,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const productsByHandlesQueryOptions = (handles: string[]) => {
  const normalized = [...new Set(handles)].sort();
  return queryOptions({
    queryKey: ["storefront", "products-by-handles", normalized],
    queryFn: () => fetchProductsByHandles(normalized),
    enabled: normalized.length > 0,
    staleTime: 60 * 1000,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });
};

export const storefrontSearchQueryOptions = (term: string) =>
  queryOptions({
    queryKey: ["storefront", "search", term.trim()],
    queryFn: () => searchStorefront(term),
    enabled: Boolean(term.trim()),
    staleTime: 60 * 1000,
    retry: STOREFRONT_QUERY_RETRY_COUNT,
    retryDelay: storefrontRetryDelay,
  });

export const shopPoliciesQueryOptions = () =>
  queryOptions({
    queryKey: ["storefront", "policies"],
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
