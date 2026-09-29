import * as nativeStore from "@/lib/nativeStore";
import type { StorefrontProductRow } from "@/lib/nativeStore";
import type { StoreCollection, StoreProduct } from "@/lib/storeTypes";

/**
 * Space Call storefront gateway.
 *
 * The homepage product-row read can use the Rust API in production. Product hydration
 * (variants, images, collections, brands, category specs) remains on the proven Supabase
 * path for this first migration step. Any Rust failure falls back immediately to Supabase.
 */

const DEFAULT_RUST_API_URL = "https://space-call-rust-backend-production.up.railway.app";
const RUST_CATALOG_TIMEOUT_MS = 2_500;

function rustCatalogConfig() {
  const viteEnv = import.meta.env as Record<string, string | boolean | undefined>;
  const configuredEnabled = viteEnv["VITE_RUST_CATALOG_ENABLED"];
  const enabled =
    configuredEnabled === "true" ||
    (configuredEnabled === undefined && Boolean(viteEnv["PROD"]));

  return {
    enabled,
    apiUrl:
      (typeof viteEnv["VITE_RUST_API_URL"] === "string" && viteEnv["VITE_RUST_API_URL"].trim()) ||
      DEFAULT_RUST_API_URL,
  };
}

function isStorefrontProductRow(value: unknown): value is StorefrontProductRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;

  return (
    typeof row["id"] === "string" &&
    typeof row["title"] === "string" &&
    typeof row["description"] === "string" &&
    typeof row["handle"] === "string" &&
    typeof row["created_at"] === "string" &&
    typeof row["updated_at"] === "string" &&
    typeof row["currency"] === "string" &&
    typeof row["stock_quantity"] === "number" &&
    typeof row["track_inventory"] === "boolean" &&
    typeof row["allow_backorder"] === "boolean" &&
    typeof row["best_seller"] === "boolean" &&
    typeof row["sort_order"] === "number" &&
    Array.isArray(row["tags"]) &&
    "specifications" in row &&
    "base_price" in row
  );
}

async function fetchRustHomepageProducts(first: number): Promise<StoreProduct[]> {
  const { apiUrl } = rustCatalogConfig();
  const limit = Math.min(100, Math.max(1, Math.trunc(first)));
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), RUST_CATALOG_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/api/catalog/products?limit=${limit}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Rust catalog returned HTTP ${response.status}`);
    }

    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows) || !rows.every(isStorefrontProductRow)) {
      throw new Error("Rust catalog returned an invalid product-row contract");
    }

    return nativeStore.hydrateProductRows(rows);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function invalidateNativeStoreCache() {
  nativeStore.invalidateNativeStoreCache();
}

export function fetchCatalogProducts(first = 500): Promise<StoreProduct[]> {
  return nativeStore.fetchCatalogProducts(first);
}

export async function fetchHomepageProducts(first = 48): Promise<StoreProduct[]> {
  if (first <= 0) return [];

  const { enabled } = rustCatalogConfig();
  if (enabled) {
    try {
      return await fetchRustHomepageProducts(first);
    } catch (error) {
      console.warn("Rust homepage catalog unavailable; falling back to Supabase.", error);
    }
  }

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

export type HomepageProductSource = nativeStore.HomepageProductSource;

export function fetchHomepageConfiguredProducts(config: {
  source: HomepageProductSource;
  sourceValue?: string;
  manualProductIds?: string[];
  count?: number;
}): Promise<StoreProduct[]> {
  return nativeStore.fetchHomepageConfiguredProducts(config);
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

export function fetchProductsByIds(ids: string[]): Promise<StoreProduct[]> {
  return nativeStore.fetchProductsByIds(ids);
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
