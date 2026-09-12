import { fetchShopPolicies } from "@/lib/policies";
import { fetchShowcaseCollections } from "@/lib/merchandising";
import { queryOptions } from "@tanstack/react-query";

import {
  fetchCatalogIndexProducts,
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

const CATALOG_STALE_TIME = 2 * 60 * 1000;

/**
 * Lightweight discovery index for navigation, category rails and brand facets.
 * It intentionally excludes product images/variants/options from the Shopify payload.
 */
export const navigationCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "catalog-navigation"],
    queryFn: async () => buildCatalogIndex(await fetchCatalogIndexProducts(60)),
    staleTime: CATALOG_STALE_TIME,
  });

/** Rich bounded catalog used by product grids and quick actions. */
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
    staleTime: 60 * 1000,
  });
};

function normalizeSearchTerm(term: string) {
  return term.trim().replace(/\s+/g, " ");
}

/**
 * Product-only search. Collections are query-independent and should come from
 * collectionsQueryOptions() so typing several terms does not refetch them.
 */
export const productSearchQueryOptions = (term: string) => {
  const normalized = normalizeSearchTerm(term);
  return queryOptions({
    queryKey: ["shopify", "product-search", normalized.toLowerCase()],
    queryFn: () => fetchProducts(20, normalized),
    enabled: Boolean(normalized),
    staleTime: 60 * 1000,
  });
};

/** Legacy combined search kept for compatibility with any remaining consumers. */
export const storefrontSearchQueryOptions = (term: string) => {
  const normalized = normalizeSearchTerm(term);
  return queryOptions({
    queryKey: ["shopify", "search", normalized.toLowerCase()],
    queryFn: () => searchStorefront(normalized),
    enabled: Boolean(normalized),
    staleTime: 60 * 1000,
  });
};

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