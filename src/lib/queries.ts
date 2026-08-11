import { queryOptions } from "@tanstack/react-query";

import { fetchAllProducts, fetchCollectionByHandle, fetchCollections, fetchProductByHandle } from "@/lib/shopify";
import { buildCatalogIndex } from "@/lib/taxonomy";

const CATALOG_STALE_TIME = 2 * 60 * 1000;

/** The full Shopify catalog, indexed into the dynamic category/brand taxonomy. */
export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "catalog"],
    queryFn: async () => buildCatalogIndex(await fetchAllProducts()),
    staleTime: CATALOG_STALE_TIME,
  });

export const collectionsQueryOptions = () =>
  queryOptions({
    queryKey: ["shopify", "collections"],
    queryFn: () => fetchCollections(100),
    staleTime: CATALOG_STALE_TIME,
  });

export const collectionQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["shopify", "collection", handle],
    queryFn: () => fetchCollectionByHandle(handle),
    staleTime: CATALOG_STALE_TIME,
  });

export const productQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["shopify", "product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: CATALOG_STALE_TIME,
  });
