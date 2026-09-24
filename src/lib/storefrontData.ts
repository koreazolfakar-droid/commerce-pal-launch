import * as nativeStore from "@/lib/nativeStore";
import type { StoreCollection, StoreProduct } from "@/lib/storeTypes";

/**
 * Native Space Call storefront gateway.
 *
 * Supabase is the only live commerce source. There is intentionally no secondary commerce
 * fallback here: failures surface to the existing React Query/session
 * fallback instead of waiting for a second commerce backend.
 */
export function invalidateNativeStoreCache() {
  nativeStore.invalidateNativeStoreCache();
}

export function fetchCatalogProducts(first = 500): Promise<StoreProduct[]> {
  return nativeStore.fetchCatalogProducts(first);
}

export function fetchHomepageProducts(first = 48): Promise<StoreProduct[]> {
  return nativeStore.fetchHomepageProducts(first);
}

export function fetchBrandVendors(): Promise<string[]> {
  return nativeStore.fetchBrandVendors();
}

export function fetchNavigationCatalogFacets() {
  return nativeStore.fetchNavigationCatalogFacets();
}

export function fetchProductByHandle(handle: string): Promise<StoreProduct | null> {
  return nativeStore.fetchProductByHandle(handle);
}

export function fetchCollections(first = 100): Promise<StoreCollection[]> {
  return nativeStore.fetchCollections(first);
}

export function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: StoreCollection; products: StoreProduct[] } | null> {
  return nativeStore.fetchCollectionByHandle(handle, pageSize);
}

export function fetchNewestProducts(first = 12): Promise<StoreProduct[]> {
  return nativeStore.fetchNewestProducts(first);
}

export function fetchBestSellingProducts(first = 12): Promise<StoreProduct[]> {
  return nativeStore.fetchBestSellingProducts(first);
}

export function fetchProductsByVendor(vendor: string, first = 8): Promise<StoreProduct[]> {
  return nativeStore.fetchProductsByVendor(vendor, first);
}

export function fetchAllProductsByVendor(vendor: string): Promise<StoreProduct[]> {
  return nativeStore.fetchAllProductsByVendor(vendor);
}

export function fetchProductsByHandles(handles: string[]): Promise<StoreProduct[]> {
  return nativeStore.fetchProductsByHandles(handles);
}

export function fetchProductRecommendations(handle: string, first = 8): Promise<StoreProduct[]> {
  return nativeStore.fetchProductRecommendations(handle, first);
}

export function searchStorefront(
  term: string,
): Promise<{ products: StoreProduct[]; collections: StoreCollection[] }> {
  return nativeStore.searchStorefront(term);
}
