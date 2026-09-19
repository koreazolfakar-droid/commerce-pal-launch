import * as nativeStore from "@/lib/nativeStore";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

/**
 * Native Space Call storefront gateway.
 *
 * Supabase is the only live commerce source. There is intentionally no remote
 * Shopify fallback here: failures surface to the existing React Query/session
 * fallback instead of waiting for a second commerce backend.
 */
export function invalidateNativeStoreCache() {
  nativeStore.invalidateNativeStoreCache();
}

export function fetchCatalogProducts(first = 500): Promise<ShopifyProduct[]> {
  return nativeStore.fetchCatalogProducts(first);
}

export function fetchHomepageProducts(first = 48): Promise<ShopifyProduct[]> {
  return nativeStore.fetchHomepageProducts(first);
}

export function fetchBrandVendors(): Promise<string[]> {
  return nativeStore.fetchBrandVendors();
}

export function fetchNavigationCatalogFacets() {
  return nativeStore.fetchNavigationCatalogFacets();
}

export function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  return nativeStore.fetchProductByHandle(handle);
}

export function fetchCollections(first = 100): Promise<ShopifyCollection[]> {
  return nativeStore.fetchCollections(first);
}

export function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
  return nativeStore.fetchCollectionByHandle(handle, pageSize);
}

export function fetchNewestProducts(first = 12): Promise<ShopifyProduct[]> {
  return nativeStore.fetchNewestProducts(first);
}

export function fetchBestSellingProducts(first = 12): Promise<ShopifyProduct[]> {
  return nativeStore.fetchBestSellingProducts(first);
}

export function fetchProductsByVendor(vendor: string, first = 8): Promise<ShopifyProduct[]> {
  return nativeStore.fetchProductsByVendor(vendor, first);
}

export function fetchAllProductsByVendor(vendor: string): Promise<ShopifyProduct[]> {
  return nativeStore.fetchAllProductsByVendor(vendor);
}

export function fetchProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
  return nativeStore.fetchProductsByHandles(handles);
}

export function fetchProductRecommendations(
  handle: string,
  first = 8,
): Promise<ShopifyProduct[]> {
  return nativeStore.fetchProductRecommendations(handle, first);
}

export function searchStorefront(
  term: string,
): Promise<{ products: ShopifyProduct[]; collections: ShopifyCollection[] }> {
  return nativeStore.searchStorefront(term);
}
