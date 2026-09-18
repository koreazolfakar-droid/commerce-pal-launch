import * as localProvider from "./localStorefrontProvider";
import * as supabaseProvider from "./supabaseStorefrontProvider";
import type { StoreCollection, StoreProduct } from "./storefrontTypes";

type ProductSortKey = "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE";
type ProviderMode = "local" | "supabase";

const PROBE_TTL_MS = 15_000;
let cachedMode: { mode: ProviderMode; checkedAt: number } | null = null;
let probeRequest: Promise<ProviderMode> | null = null;

function configuredMode(): "auto" | ProviderMode {
  const raw = (import.meta.env["VITE_STOREFRONT_DATA_SOURCE"] ?? "auto")
    .trim()
    .toLowerCase();
  return raw === "supabase" || raw === "local" ? raw : "auto";
}

/**
 * Select exactly one catalogue source for a request.
 *
 * - local: isolated demo data only.
 * - supabase: Space Call native catalogue only.
 * - auto (staging default): Supabase takes over as soon as at least one active,
 *   published product exists. Until then the isolated demo catalogue remains
 *   available so the no-Shopify preview does not become blank.
 *
 * A successful Supabase activation is sticky for this runtime. A temporary
 * network error therefore cannot make demo products reappear after the native
 * catalogue has gone live.
 */
async function resolveProviderMode(): Promise<ProviderMode> {
  const configured = configuredMode();
  if (configured !== "auto") return configured;

  const now = Date.now();
  if (cachedMode?.mode === "supabase") return "supabase";
  if (cachedMode && now - cachedMode.checkedAt < PROBE_TTL_MS) {
    return cachedMode.mode;
  }
  if (probeRequest) return probeRequest;

  probeRequest = supabaseProvider
    .hasPublishedProducts()
    .then((hasProducts): ProviderMode => (hasProducts ? "supabase" : "local"))
    .then((mode) => {
      cachedMode = { mode, checkedAt: Date.now() };
      return mode;
    })
    .catch((error) => {
      console.warn(
        "Space Call native catalogue probe failed; preserving the previous staging source.",
        error,
      );
      return cachedMode?.mode ?? "local";
    })
    .finally(() => {
      probeRequest = null;
    });

  return probeRequest;
}

async function providers() {
  return (await resolveProviderMode()) === "supabase"
    ? supabaseProvider
    : localProvider;
}

export async function fetchProducts(
  first = 30,
  query?: string,
  sortKey?: ProductSortKey,
  reverse?: boolean,
): Promise<StoreProduct[]> {
  const provider = await providers();
  return provider.fetchProducts(first, query, sortKey, reverse);
}

export async function fetchBestSellingProducts(first = 12) {
  return (await providers()).fetchBestSellingProducts(first);
}

export async function fetchCatalogProducts(first = 60) {
  return (await providers()).fetchCatalogProducts(first);
}

export async function fetchBrandVendors() {
  return (await providers()).fetchBrandVendors();
}

export async function fetchProductByHandle(handle: string) {
  return (await providers()).fetchProductByHandle(handle);
}

export async function fetchProductRecommendations(handle: string) {
  return (await providers()).fetchProductRecommendations(handle);
}

export async function fetchCollections(first = 50): Promise<StoreCollection[]> {
  return (await providers()).fetchCollections(first);
}

export async function fetchCollectionByHandle(handle: string, pageSize = 48) {
  return (await providers()).fetchCollectionByHandle(handle, pageSize);
}

export async function searchStorefront(term: string) {
  return (await providers()).searchStorefront(term);
}

export async function fetchProductsByVendor(vendor: string, first = 8) {
  return (await providers()).fetchProductsByVendor(vendor, first);
}

export async function fetchAllProductsByVendor(vendor: string) {
  return (await providers()).fetchAllProductsByVendor(vendor);
}

export async function fetchProductsByHandles(handles: string[], first = 20) {
  return (await providers()).fetchProductsByHandles(handles, first);
}

export type { StoreCollection, StoreProduct, StoreProductNode } from "./storefrontTypes";
