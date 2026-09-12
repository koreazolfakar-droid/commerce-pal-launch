import { fetchShopPolicies } from "@/lib/policies";
import { fetchShowcaseCollections } from "@/lib/merchandising";
import { queryOptions } from "@tanstack/react-query";

import {
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
} from "@/lib/shopify";
import { buildCatalogIndex } from "@/lib/taxonomy";

// Keep client data aligned with the one-minute server cache. Shopify webhooks
// invalidate the server immediately; active tabs revalidate as soon as data is stale.
const CATALOG_STALE_TIME = 30 * 1000;

/** Bounded discovery index. Route-specific product data uses dedicated queries. */
export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "catalog"],
    queryFn: async () => buildCatalogIndex(await fetchCatalogProducts(60)),
    staleTime: CATALOG_STALE_TIME,
  });

export const collectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "collections"],
    queryFn: () => fetchCollections(),
    staleTime: CATALOG_STALE_TIME,
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

/** Native creation order, not the cached catalog order or an assumed "new" tag. */
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

/** Shopify-native recommendations for the product detail page. */
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

export const productsByHandlesQueryOptions = (handles: string[]) => {
  const normalized = [...new Set(handles)].sort();
  return queryOptions({
    queryKey: ["shopify", "products-by-handles", normalized],
    queryFn: () => fetchProductsByHandles(normalized),
    enabled: normalized.length > 0,
    staleTime: CATALOG_STALE_TIME,
  });
};

export const storefrontSearchQueryOptions = (term: string) =>
  queryOptions({
    queryKey: ["shopify", "search", term.trim()],
    queryFn: () => searchStorefront(term),
    enabled: Boolean(term.trim()),
    staleTime: CATALOG_STALE_TIME,
  });

export const shopPoliciesQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "policies"],
    queryFn: () => fetchShopPolicies(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export const showcaseCollectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["showcase-collections"],
    queryFn: fetchShowcaseCollections,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
