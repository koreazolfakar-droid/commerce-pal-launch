import * as nativeStore from "@/lib/nativeStore";
import {
  fetchAllProductsByVendor as fetchShopifyAllProductsByVendor,
  fetchBestSellingProducts as fetchShopifyBestSellingProducts,
  fetchBrandVendors as fetchShopifyBrandVendors,
  fetchCatalogProducts as fetchShopifyCatalogProducts,
  fetchCollectionByHandle as fetchShopifyCollectionByHandle,
  fetchCollections as fetchShopifyCollections,
  fetchProductByHandle as fetchShopifyProductByHandle,
  fetchProductRecommendations as fetchShopifyProductRecommendations,
  fetchProducts as fetchShopifyProducts,
  fetchProductsByHandles as fetchShopifyProductsByHandles,
  fetchProductsByVendor as fetchShopifyProductsByVendor,
  searchStorefront as searchShopifyStorefront,
} from "@/lib/shopify";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

const SUPABASE_PUBLIC_READ_TIMEOUT_MS = 4_000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Supabase public ${label} timed out`)),
          SUPABASE_PUBLIC_READ_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function withShopifyFallback<T>(
  label: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await withTimeout(primary(), label);
  } catch (error) {
    console.error(
      `[StorefrontData] Supabase ${label} failed; using Shopify fallback.`,
      error,
    );
    return fallback();
  }
}

export function invalidateNativeStoreCache() {
  nativeStore.invalidateNativeStoreCache();
}

export function fetchCatalogProducts(first = 500): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "catalog",
    () => nativeStore.fetchCatalogProducts(first),
    () => fetchShopifyCatalogProducts(first),
  );
}

export function fetchBrandVendors(): Promise<string[]> {
  return withShopifyFallback(
    "brands",
    () => nativeStore.fetchBrandVendors(),
    () => fetchShopifyBrandVendors(),
  );
}

export function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  return withShopifyFallback(
    "product",
    () => nativeStore.fetchProductByHandle(handle),
    () => fetchShopifyProductByHandle(handle),
  );
}

export function fetchCollections(first = 100): Promise<ShopifyCollection[]> {
  return withShopifyFallback(
    "collections",
    () => nativeStore.fetchCollections(first),
    () => fetchShopifyCollections(first),
  );
}

export function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
  return withShopifyFallback(
    "collection",
    () => nativeStore.fetchCollectionByHandle(handle, pageSize),
    () => fetchShopifyCollectionByHandle(handle, pageSize),
  );
}

export function fetchNewestProducts(first = 12): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "newest products",
    () => nativeStore.fetchNewestProducts(first),
    () => fetchShopifyProducts(first, undefined, "CREATED_AT", true),
  );
}

export function fetchBestSellingProducts(first = 12): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "best sellers",
    () => nativeStore.fetchBestSellingProducts(first),
    () => fetchShopifyBestSellingProducts(first),
  );
}

export function fetchProductsByVendor(vendor: string, first = 8): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "vendor products",
    () => nativeStore.fetchProductsByVendor(vendor, first),
    () => fetchShopifyProductsByVendor(vendor, first),
  );
}

export function fetchAllProductsByVendor(vendor: string): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "all vendor products",
    () => nativeStore.fetchAllProductsByVendor(vendor),
    () => fetchShopifyAllProductsByVendor(vendor),
  );
}

export function fetchProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "products by handles",
    () => nativeStore.fetchProductsByHandles(handles),
    () => fetchShopifyProductsByHandles(handles, handles.length),
  );
}

export function fetchProductRecommendations(
  handle: string,
  first = 8,
): Promise<ShopifyProduct[]> {
  return withShopifyFallback(
    "product recommendations",
    () => nativeStore.fetchProductRecommendations(handle, first),
    async () => (await fetchShopifyProductRecommendations(handle)).slice(0, first),
  );
}

export function searchStorefront(
  term: string,
): Promise<{ products: ShopifyProduct[]; collections: ShopifyCollection[] }> {
  return withShopifyFallback(
    "search",
    () => nativeStore.searchStorefront(term),
    () => searchShopifyStorefront(term),
  );
}
