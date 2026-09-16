import { supabase } from "@/integrations/supabase/client";
import { fetchCmsSnapshot } from "@/lib/cms";
import * as nativeStore from "@/lib/nativeStore";
import * as shopifyStore from "@/lib/shopify";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

const MAX_PRODUCTS = 100;

type ProductSortKey = "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE";
type ProductBrandRow = { id: string; brand_id: string | null };

type SearchResult = {
  products: ShopifyProduct[];
  collections: ShopifyCollection[];
};

function bounded(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_PRODUCTS);
}

function productKey(product: ShopifyProduct) {
  return product.node.handle.trim().toLowerCase();
}

function collectionKey(collection: ShopifyCollection) {
  return collection.handle.trim().toLowerCase();
}

function mergeProducts(
  nativeProducts: ShopifyProduct[],
  shopifyProducts: ShopifyProduct[],
  limit = MAX_PRODUCTS,
) {
  const result: ShopifyProduct[] = [];
  const seen = new Set<string>();

  // Local Space Call products intentionally win on duplicate handles. This lets
  // the store migrate one product at a time without duplicate URLs or cards.
  for (const product of [...nativeProducts, ...shopifyProducts]) {
    const key = productKey(product);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(product);
    if (result.length >= limit) break;
  }

  return result;
}

function mergeCollections(
  nativeCollections: ShopifyCollection[],
  shopifyCollections: ShopifyCollection[],
  limit = MAX_PRODUCTS,
) {
  const result: ShopifyCollection[] = [];
  const seen = new Set<string>();

  // Preserve current Shopify collection artwork/title when handles overlap,
  // while still exposing native-only collections.
  for (const collection of [...shopifyCollections, ...nativeCollections]) {
    const key = collectionKey(collection);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(collection);
    if (result.length >= limit) break;
  }

  return result;
}

function priceOf(product: ShopifyProduct) {
  const value = Number(product.node.priceRange.minVariantPrice.amount);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function createdAtOf(product: ShopifyProduct) {
  const timestamp = Date.parse(product.node.createdAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortMergedProducts(
  products: ShopifyProduct[],
  sortKey?: ProductSortKey,
  reverse?: boolean,
) {
  if (!sortKey || sortKey === "BEST_SELLING") return products;

  const direction = reverse ? -1 : 1;
  return [...products].sort((left, right) => {
    if (sortKey === "CREATED_AT") {
      return (createdAtOf(left) - createdAtOf(right)) * direction;
    }
    if (sortKey === "PRICE") {
      return (priceOf(left) - priceOf(right)) * direction;
    }
    return left.node.title.localeCompare(right.node.title) * direction;
  });
}

function reportSourceFailure(source: "Shopify" | "Space Call", operation: string, reason: unknown) {
  console.warn(`${source} ${operation} failed; continuing with the other storefront source.`, reason);
}

async function settlePair<TShopify, TNative>(
  operation: string,
  shopifyPromise: Promise<TShopify>,
  nativePromise: Promise<TNative>,
): Promise<[TShopify | null, TNative | null]> {
  const [shopifyResult, nativeResult] = await Promise.allSettled([shopifyPromise, nativePromise]);

  if (shopifyResult.status === "rejected") {
    reportSourceFailure("Shopify", operation, shopifyResult.reason);
  }
  if (nativeResult.status === "rejected") {
    reportSourceFailure("Space Call", operation, nativeResult.reason);
  }

  if (shopifyResult.status === "rejected" && nativeResult.status === "rejected") {
    throw shopifyResult.reason instanceof Error
      ? shopifyResult.reason
      : nativeResult.reason instanceof Error
        ? nativeResult.reason
        : new Error(`Both storefront sources failed during ${operation}`);
  }

  return [
    shopifyResult.status === "fulfilled" ? shopifyResult.value : null,
    nativeResult.status === "fulfilled" ? nativeResult.value : null,
  ];
}

/**
 * cms_brands is intentionally not directly readable by anonymous users.
 * Enrich native products through the curated public CMS gateway instead of
 * weakening CMS RLS or exposing the dashboard table directly.
 */
async function enrichNativeBrands(products: ShopifyProduct[]) {
  if (!products.length) return products;

  const ids = products.map((product) => product.node.id).filter(Boolean);
  if (!ids.length) return products;

  const [productRowsResult, cms] = await Promise.all([
    supabase.from("store_products" as never).select("id,brand_id").in("id", ids),
    fetchCmsSnapshot(),
  ]);

  if (productRowsResult.error) throw productRowsResult.error;

  const brandIdByProduct = new Map(
    ((productRowsResult.data ?? []) as ProductBrandRow[]).map((row) => [row.id, row.brand_id]),
  );
  const brandNameById = new Map(
    cms.brands.filter((brand) => brand.is_visible).map((brand) => [brand.id, brand.name]),
  );

  return products.map((product) => {
    const brandId = brandIdByProduct.get(product.node.id);
    const vendor = brandId ? brandNameById.get(brandId) : undefined;
    if (!vendor || product.node.vendor === vendor) return product;
    return { node: { ...product.node, vendor } };
  });
}

async function nativeProductsByVendor(vendor: string, first = 8) {
  const normalized = vendor.trim().toLowerCase();
  if (!normalized) return [];
  const products = await enrichNativeBrands(await nativeStore.fetchProducts(MAX_PRODUCTS));
  return products
    .filter((product) => product.node.vendor?.trim().toLowerCase() === normalized)
    .slice(0, bounded(first, 8));
}

export async function fetchProducts(
  first = 30,
  query?: string,
  sortKey?: ProductSortKey,
  reverse?: boolean,
): Promise<ShopifyProduct[]> {
  const limit = bounded(first, 30);
  const [shopifyProducts, nativeProducts] = await settlePair(
    "product listing",
    shopifyStore.fetchProducts(limit, query, sortKey, reverse),
    nativeStore.fetchProducts(limit, query, sortKey, reverse).then(enrichNativeBrands),
  );

  return sortMergedProducts(
    mergeProducts(nativeProducts ?? [], shopifyProducts ?? [], limit),
    sortKey,
    reverse,
  ).slice(0, limit);
}

export function fetchCatalogProducts(first = 60) {
  return fetchProducts(bounded(first, 60));
}

export async function fetchBestSellingProducts(first = 12) {
  const limit = bounded(first, 12);
  const [shopifyProducts, nativeProducts] = await settlePair(
    "best sellers",
    shopifyStore.fetchBestSellingProducts(limit),
    nativeStore.fetchBestSellingProducts(limit).then(enrichNativeBrands),
  );
  return mergeProducts(nativeProducts ?? [], shopifyProducts ?? [], limit);
}

export async function fetchBrandVendors(): Promise<string[]> {
  const [shopifyVendors, nativeProducts] = await settlePair(
    "brand discovery",
    shopifyStore.fetchBrandVendors(),
    nativeStore.fetchProducts(MAX_PRODUCTS).then(enrichNativeBrands),
  );

  const vendors = [
    ...(nativeProducts ?? []).flatMap((product) => (product.node.vendor ? [product.node.vendor] : [])),
    ...(shopifyVendors ?? []),
  ];

  const seen = new Set<string>();
  return vendors.filter((vendor) => {
    const normalized = vendor.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const normalized = handle.trim();
  if (!normalized) return null;

  const [shopifyProduct, nativeProduct] = await settlePair(
    "product detail",
    shopifyStore.fetchProductByHandle(normalized),
    nativeStore.fetchProductByHandle(normalized),
  );

  if (nativeProduct) {
    return (await enrichNativeBrands([nativeProduct]))[0] ?? nativeProduct;
  }
  return shopifyProduct;
}

export async function fetchCollections(first = 50): Promise<ShopifyCollection[]> {
  const limit = bounded(first, 50);
  const [shopifyCollections, nativeCollections] = await settlePair(
    "collection listing",
    shopifyStore.fetchCollections(limit),
    nativeStore.fetchCollections(limit),
  );
  return mergeCollections(nativeCollections ?? [], shopifyCollections ?? [], limit);
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
  const limit = bounded(pageSize, 48);
  const [shopifyResult, nativeResult] = await settlePair(
    "collection detail",
    shopifyStore.fetchCollectionByHandle(handle, limit),
    nativeStore.fetchCollectionByHandle(handle, limit),
  );

  if (!shopifyResult && !nativeResult) return null;
  const nativeProducts = nativeResult
    ? await enrichNativeBrands(nativeResult.products)
    : ([] as ShopifyProduct[]);

  return {
    collection: shopifyResult?.collection ?? nativeResult!.collection,
    products: mergeProducts(nativeProducts, shopifyResult?.products ?? [], limit),
  };
}

export async function searchStorefront(term: string): Promise<SearchResult> {
  const trimmed = term.trim();
  if (!trimmed) return { products: [], collections: [] };

  const [shopifyResult, nativeResult] = await settlePair(
    "search",
    shopifyStore.searchStorefront(trimmed),
    nativeStore.searchStorefront(trimmed),
  );

  const nativeProducts = nativeResult
    ? await enrichNativeBrands(nativeResult.products)
    : ([] as ShopifyProduct[]);

  return {
    products: mergeProducts(nativeProducts, shopifyResult?.products ?? [], 20),
    collections: mergeCollections(
      nativeResult?.collections ?? [],
      shopifyResult?.collections ?? [],
      30,
    ),
  };
}

export async function fetchProductsByVendor(vendor: string, first = 8) {
  const limit = bounded(first, 8);
  const [shopifyProducts, nativeProducts] = await settlePair(
    "vendor products",
    shopifyStore.fetchProductsByVendor(vendor, limit),
    nativeProductsByVendor(vendor, limit),
  );
  return mergeProducts(nativeProducts ?? [], shopifyProducts ?? [], limit);
}

export async function fetchAllProductsByVendor(vendor: string) {
  const [shopifyProducts, nativeProducts] = await settlePair(
    "brand page",
    shopifyStore.fetchAllProductsByVendor(vendor),
    nativeProductsByVendor(vendor, MAX_PRODUCTS),
  );
  return mergeProducts(nativeProducts ?? [], shopifyProducts ?? [], MAX_PRODUCTS);
}

export async function fetchProductsByHandles(handles: string[]) {
  const unique = [...new Set(handles.map((handle) => handle.trim()).filter(Boolean))].slice(
    0,
    MAX_PRODUCTS,
  );
  if (!unique.length) return [];

  const [shopifyProducts, nativeProducts] = await settlePair(
    "product handle lookup",
    shopifyStore.fetchProductsByHandles(unique, unique.length),
    nativeStore.fetchProductsByHandles(unique).then(enrichNativeBrands),
  );

  const merged = mergeProducts(nativeProducts ?? [], shopifyProducts ?? [], unique.length);
  const byHandle = new Map(merged.map((product) => [productKey(product), product]));
  return unique.flatMap((handle) => {
    const product = byHandle.get(handle.toLowerCase());
    return product ? [product] : [];
  });
}

export async function fetchProductRecommendations(handle: string): Promise<ShopifyProduct[]> {
  const product = await fetchProductByHandle(handle);
  if (!product) return [];

  const vendor = product.node.vendor?.trim();
  const nativePromise = vendor
    ? nativeProductsByVendor(vendor, 10)
    : nativeStore.fetchProducts(12).then(enrichNativeBrands);

  const [shopifyRecommendations, nativeRecommendations] = await settlePair(
    "product recommendations",
    shopifyStore.fetchProductRecommendations(handle),
    nativePromise,
  );

  return mergeProducts(nativeRecommendations ?? [], shopifyRecommendations ?? [], 12)
    .filter((candidate) => candidate.node.handle !== handle)
    .slice(0, 8);
}
