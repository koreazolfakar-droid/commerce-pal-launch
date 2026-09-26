import { publicSupabase } from "@/integrations/supabase/publicClient";
import { parseSpecifications, parseTemplate, type SpecTemplate } from "@/lib/specifications";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { StoreCollection, StoreProduct } from "@/lib/storeTypes";
import { buildCatalogIndex } from "@/lib/taxonomy";
import { productSearchScore, textSearchScore } from "@/lib/searchRanking";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;
type CollectionRow = Tables<"store_collections">;
type CollectionLinkRow = Tables<"store_collection_products">;
type BrandRow = Tables<"cms_brands">;
type CategoryRow = Tables<"store_categories">;

type StorefrontProductRow = Pick<
  ProductRow,
  | "id"
  | "title"
  | "description"
  | "description_html"
  | "handle"
  | "brand_id"
  | "product_type"
  | "created_at"
  | "updated_at"
  | "seo_title"
  | "seo_description"
  | "tags"
  | "base_price"
  | "compare_at_price"
  | "currency"
  | "track_inventory"
  | "allow_backorder"
  | "stock_quantity"
  | "best_seller"
  | "sort_order"
  | "category_id"
  | "specifications"
>;
type StorefrontVariantRow = Pick<
  VariantRow,
  | "id"
  | "product_id"
  | "title"
  | "price"
  | "compare_at_price"
  | "is_active"
  | "track_inventory"
  | "allow_backorder"
  | "stock_quantity"
  | "sku"
  | "barcode"
  | "image_url"
  | "options"
  | "sort_order"
>;
type StorefrontImageRow = Pick<
  ImageRow,
  "product_id" | "url" | "alt_text" | "is_primary" | "sort_order"
>;
type StorefrontCollectionRow = Pick<
  CollectionRow,
  "id" | "handle" | "title" | "description" | "image_url" | "seo_title" | "seo_description"
>;
type StorefrontCollectionLinkRow = Pick<
  CollectionLinkRow,
  "collection_id" | "product_id" | "sort_order"
>;
type StorefrontBrandRow = Pick<BrandRow, "id" | "name" | "slug">;
type StorefrontCategoryRow = Pick<CategoryRow, "id" | "spec_template">;
type NavigationProductRow = Pick<
  ProductRow,
  "id" | "title" | "handle" | "brand_id" | "product_type" | "tags"
>;

const STOREFRONT_PRODUCT_SELECT =
  "id,title,description,description_html,handle,brand_id,product_type,created_at,updated_at,seo_title,seo_description,tags,base_price,compare_at_price,currency,track_inventory,allow_backorder,stock_quantity,best_seller,sort_order,category_id,specifications" as const;
const STOREFRONT_VARIANT_SELECT =
  "id,product_id,title,price,compare_at_price,is_active,track_inventory,allow_backorder,stock_quantity,sku,barcode,image_url,options,sort_order" as const;
const STOREFRONT_IMAGE_SELECT = "product_id,url,alt_text,is_primary,sort_order" as const;
const STOREFRONT_COLLECTION_SELECT =
  "id,handle,title,description,image_url,seo_title,seo_description" as const;
const STOREFRONT_COLLECTION_LINK_SELECT = "collection_id,product_id,sort_order" as const;
const STOREFRONT_BRAND_SELECT = "id,name,slug" as const;
const STOREFRONT_CATEGORY_SELECT = "id,spec_template" as const;
const STOREFRONT_NAVIGATION_PRODUCT_SELECT =
  "id,title,handle,brand_id,product_type,tags" as const;

type NativeProduct = {
  product: StoreProduct;
  row: StorefrontProductRow;
};

type NativeSnapshot = {
  products: NativeProduct[];
  collections: StorefrontCollectionRow[];
  links: StorefrontCollectionLinkRow[];
  brands: StorefrontBrandRow[];
};

const CACHE_TTL_MS = 30_000;
const HYDRATED_PRODUCT_CACHE_TTL_MS = 60_000;
const hydratedProductCache = new Map<string, { expiresAt: number; product: StoreProduct }>();
// After the fresh window ends, keep serving the last snapshot for up to five
// minutes while a single background refresh runs. Repeat storefront visitors
// never wait on the database round-trip.
const STALE_TTL_MS = 5 * 60_000;
let cachedSnapshot: { expiresAt: number; staleUntil: number; value: NativeSnapshot } | null = null;
let pendingSnapshot: Promise<NativeSnapshot> | null = null;

const STOREFRONT_REFRESH_STORAGE_KEY = "space-call-storefront-refresh-v1";
const STOREFRONT_REFRESH_EVENT = "space-call:storefront-refresh";
const storefrontRefreshSubscribers = new Set<() => void>();
let storefrontRefreshListenerInstalled = false;

function notifyStorefrontRefreshSubscribers() {
  for (const subscriber of storefrontRefreshSubscribers) subscriber();
}

function installStorefrontRefreshBridge() {
  if (typeof window === "undefined" || storefrontRefreshListenerInstalled) return;
  storefrontRefreshListenerInstalled = true;

  const refresh = () => {
    invalidateNativeStoreCache();
    notifyStorefrontRefreshSubscribers();
  };
  const storageRefresh = (event: StorageEvent) => {
    if (event.key === STOREFRONT_REFRESH_STORAGE_KEY) refresh();
  };

  window.addEventListener(STOREFRONT_REFRESH_EVENT, refresh);
  window.addEventListener("storage", storageRefresh);
}

export function subscribeStorefrontRefresh(subscriber: () => void) {
  storefrontRefreshSubscribers.add(subscriber);
  installStorefrontRefreshBridge();
  return () => storefrontRefreshSubscribers.delete(subscriber);
}

function assertResult<T>(
  result: { data: T | null; error: { message: string } | null },
  label: string,
): T {
  if (result.error) throw new Error(`Supabase ${label} failed: ${result.error.message}`);
  if (result.data === null) throw new Error(`Supabase ${label} returned no data`);
  return result.data;
}

function normalizeOptionName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function optionNamePreference(name: string) {
  const trimmed = name.trim();
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (!letters) return 0;
  if (letters === letters.toUpperCase()) return 3;
  if (/^[A-Z]/.test(trimmed)) return 2;
  return 1;
}

function canonicalOptionNames(values: Json[]) {
  const names = new Map<string, string>();
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [rawName, rawValue] of Object.entries(value)) {
      if (!["string", "number", "boolean"].includes(typeof rawValue)) continue;
      const displayName = rawName.trim().replace(/\s+/g, " ");
      if (!displayName) continue;
      const key = normalizeOptionName(displayName);
      const current = names.get(key);
      if (!current || optionNamePreference(displayName) > optionNamePreference(current)) {
        names.set(key, displayName);
      }
    }
  }
  return names;
}

function optionEntries(
  value: Json,
  canonicalNames?: ReadonlyMap<string, string>,
): Array<{ name: string; value: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const entries = new Map<string, string>();
  for (const [rawName, raw] of Object.entries(value)) {
    if (!["string", "number", "boolean"].includes(typeof raw)) continue;
    const normalized = normalizeOptionName(rawName);
    if (!normalized) continue;
    const name = canonicalNames?.get(normalized) ?? rawName.trim().replace(/\s+/g, " ");
    entries.set(name, String(raw));
  }

  return [...entries].map(([name, optionValue]) => ({ name, value: optionValue }));
}

function groupByProduct<T extends { product_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.product_id);
    if (list) list.push(row);
    else grouped.set(row.product_id, [row]);
  }
  return grouped;
}

function money(amount: number, currencyCode: string) {
  return { amount: String(amount), currencyCode };
}

function buildProduct(
  row: StorefrontProductRow,
  variants: StorefrontVariantRow[],
  images: StorefrontImageRow[],
  collections: StorefrontCollectionRow[],
  brand?: StorefrontBrandRow,
  specTemplate?: SpecTemplate,
): StoreProduct {
  const sortedVariants = [...variants].sort((a, b) => a.sort_order - b.sort_order);
  const sortedImages = [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const prices = sortedVariants.map((variant) => Number(variant.price)).filter(Number.isFinite);
  const comparePrices = sortedVariants
    .map((variant) => variant.compare_at_price)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const minPrice = prices.length ? Math.min(...prices) : Number(row.base_price || 0);
  const minCompare = comparePrices.length
    ? Math.min(...comparePrices)
    : row.compare_at_price == null
      ? null
      : Number(row.compare_at_price);

  const canonicalNames = canonicalOptionNames(sortedVariants.map((variant) => variant.options));
  const optionValues = new Map<string, string[]>();
  for (const variant of sortedVariants) {
    for (const option of optionEntries(variant.options, canonicalNames)) {
      const values = optionValues.get(option.name) ?? [];
      if (!values.includes(option.value)) values.push(option.value);
      optionValues.set(option.name, values);
    }
  }

  const mappedVariants = sortedVariants.map((variant) => {
    const availableForSale =
      variant.is_active &&
      (!variant.track_inventory || variant.allow_backorder || variant.stock_quantity > 0);
    return {
      node: {
        id: variant.id,
        title: variant.title,
        price: money(Number(variant.price), row.currency),
        compareAtPrice:
          variant.compare_at_price == null
            ? null
            : money(Number(variant.compare_at_price), row.currency),
        availableForSale,
        trackInventory: variant.track_inventory,
        allowBackorder: variant.allow_backorder,
        stockQuantity: variant.stock_quantity,
        sku: variant.sku,
        barcode: variant.barcode,
        image: variant.image_url ? { url: variant.image_url, altText: null } : null,
        selectedOptions: optionEntries(variant.options, canonicalNames),
      },
    };
  });

  const availableForSale = sortedVariants.length
    ? mappedVariants.some((edge) => edge.node.availableForSale)
    : !row.track_inventory || row.allow_backorder || row.stock_quantity > 0;

  return {
    node: {
      id: row.id,
      title: row.title,
      description: row.description,
      descriptionHtml: row.description_html ?? undefined,
      specifications: parseSpecifications(row.specifications),
      specTemplate,
      handle: row.handle,
      vendor: brand?.name,
      vendorSlug: brand?.slug,
      vendorHidden: Boolean(row.brand_id && !brand),
      productType: row.product_type ?? undefined,
      seoTitle: row.seo_title ?? undefined,
      seoDescription: row.seo_description ?? undefined,
      availableForSale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags,
      priceRange: { minVariantPrice: money(minPrice, row.currency) },
      compareAtPriceRange:
        minCompare == null ? undefined : { minVariantPrice: money(minCompare, row.currency) },
      images: {
        edges: sortedImages.map((image) => ({
          node: { url: image.url, altText: image.alt_text },
        })),
      },
      collections: {
        edges: collections.map((collection) => ({
          node: { handle: collection.handle, title: collection.title },
        })),
      },
      variants: { edges: mappedVariants },
      options: [...optionValues].map(([name, values]) => ({ name, values })),
    },
  };
}

async function hydrateProductRows(productRows: StorefrontProductRow[]): Promise<StoreProduct[]> {
  if (!productRows.length) return [];

  const now = Date.now();
  const cachedProducts = new Map<string, StoreProduct>();
  const missingRows: StorefrontProductRow[] = [];

  for (const row of productRows) {
    const cached = hydratedProductCache.get(row.id);
    if (cached && cached.expiresAt > now) {
      cachedProducts.set(row.id, cached.product);
    } else {
      if (cached) hydratedProductCache.delete(row.id);
      missingRows.push(row);
    }
  }

  if (missingRows.length) {
    const productIds = missingRows.map((row) => row.id);
    const [variantResult, imageResult, linkResult, categoryResult] = await Promise.all([
      publicSupabase
        .from("store_product_variants")
        .select(STOREFRONT_VARIANT_SELECT)
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      publicSupabase
        .from("store_product_images")
        .select(STOREFRONT_IMAGE_SELECT)
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
      publicSupabase
        .from("store_collection_products")
        .select(STOREFRONT_COLLECTION_LINK_SELECT)
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
      publicSupabase.from("store_categories").select(STOREFRONT_CATEGORY_SELECT),
    ]);

    const variants = assertResult(variantResult, "bounded product variants");
    const images = assertResult(imageResult, "bounded product images");
    const links = assertResult(linkResult, "bounded product collection links");
    const categories = assertResult(categoryResult, "bounded product categories");
    const variantsByProduct = groupByProduct(variants);
    const imagesByProduct = groupByProduct(images);
    const linksByProduct = groupByProduct(links);

    const collectionIds = [...new Set(links.map((link) => link.collection_id))];
    let collections: StorefrontCollectionRow[] = [];
    if (collectionIds.length) {
      const collectionResult = await publicSupabase
        .from("store_collections")
        .select(STOREFRONT_COLLECTION_SELECT)
        .in("id", collectionIds)
        .eq("is_active", true);
      collections = assertResult(collectionResult, "bounded product collections");
    }

    const brandIds = [
      ...new Set(missingRows.map((row) => row.brand_id).filter((id): id is string => Boolean(id))),
    ];
    let brands: StorefrontBrandRow[] = [];
    if (brandIds.length) {
      const brandResult = await publicSupabase
        .from("cms_brands")
        .select(STOREFRONT_BRAND_SELECT)
        .in("id", brandIds)
        .eq("is_visible", true);
      brands = assertResult(brandResult, "bounded product brands");
    }

    const collectionsById = new Map(collections.map((row) => [row.id, row]));
    const brandsById = new Map(brands.map((row) => [row.id, row]));
    const templatesByCategoryId = new Map(
      categories.map((row) => [row.id, parseTemplate(row.spec_template)]),
    );
    const expiresAt = Date.now() + HYDRATED_PRODUCT_CACHE_TTL_MS;

    for (const row of missingRows) {
      const productCollections = (linksByProduct.get(row.id) ?? [])
        .map((link) => collectionsById.get(link.collection_id))
        .filter((collection): collection is StorefrontCollectionRow => Boolean(collection));
      const product = buildProduct(
        row,
        variantsByProduct.get(row.id) ?? [],
        imagesByProduct.get(row.id) ?? [],
        productCollections,
        row.brand_id ? brandsById.get(row.brand_id) : undefined,
        row.category_id ? templatesByCategoryId.get(row.category_id) : undefined,
      );
      hydratedProductCache.set(row.id, { expiresAt, product });
      cachedProducts.set(row.id, product);
    }
  }

  return productRows
    .map((row) => cachedProducts.get(row.id))
    .filter((product): product is StoreProduct => Boolean(product));
}

async function fetchSnapshot(): Promise<NativeSnapshot> {
  const [
    productResult,
    variantResult,
    imageResult,
    collectionResult,
    linkResult,
    brandResult,
    categoryResult,
  ] = await Promise.all([
    publicSupabase
      .from("store_products")
      .select(STOREFRONT_PRODUCT_SELECT)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    publicSupabase
      .from("store_product_variants")
      .select(STOREFRONT_VARIANT_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_product_images")
      .select(STOREFRONT_IMAGE_SELECT)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_collections")
      .select(STOREFRONT_COLLECTION_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    publicSupabase
      .from("store_collection_products")
      .select(STOREFRONT_COLLECTION_LINK_SELECT)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("cms_brands")
      .select(STOREFRONT_BRAND_SELECT)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
    publicSupabase.from("store_categories").select(STOREFRONT_CATEGORY_SELECT),
  ]);

  const productRows = assertResult(productResult, "products");
  const variantRows = assertResult(variantResult, "variants");
  const imageRows = assertResult(imageResult, "images");
  const collectionRows = assertResult(collectionResult, "collections");
  const links = assertResult(linkResult, "collection links");
  const brands = assertResult(brandResult, "brands");
  const categories = assertResult(categoryResult, "categories");

  const variantsByProduct = groupByProduct(variantRows);
  const imagesByProduct = groupByProduct(imageRows);
  const linksByProduct = groupByProduct(links);
  const collectionsById = new Map(collectionRows.map((row) => [row.id, row]));
  const brandsById = new Map(brands.map((row) => [row.id, row]));
  const templatesByCategoryId = new Map(
    categories.map((row) => [row.id, parseTemplate(row.spec_template)]),
  );

  const products: NativeProduct[] = productRows.map((row) => {
    const productCollections = (linksByProduct.get(row.id) ?? [])
      .map((link) => collectionsById.get(link.collection_id))
      .filter((collection): collection is StorefrontCollectionRow => Boolean(collection));

    return {
      row,
      product: buildProduct(
        row,
        variantsByProduct.get(row.id) ?? [],
        imagesByProduct.get(row.id) ?? [],
        productCollections,
        row.brand_id ? brandsById.get(row.brand_id) : undefined,
        row.category_id ? templatesByCategoryId.get(row.category_id) : undefined,
      ),
    };
  });

  const value = { products, collections: collectionRows, links, brands };
  const fetchedAt = Date.now();
  cachedSnapshot = {
    expiresAt: fetchedAt + CACHE_TTL_MS,
    staleUntil: fetchedAt + CACHE_TTL_MS + STALE_TTL_MS,
    value,
  };
  return value;
}

function startSnapshotRefresh(): Promise<NativeSnapshot> {
  if (!pendingSnapshot) {
    pendingSnapshot = fetchSnapshot()
      .catch((error) => {
        // A failed background refresh keeps serving the stale snapshot.
        console.warn("Native store background refresh failed.", error);
        return cachedSnapshot?.value ?? Promise.reject(error);
      })
      .finally(() => {
        pendingSnapshot = null;
      });
  }
  return pendingSnapshot;
}

async function loadSnapshot(): Promise<NativeSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && cachedSnapshot.expiresAt > now) return cachedSnapshot.value;
  if (cachedSnapshot && cachedSnapshot.staleUntil > now) {
    // Serve the stale snapshot immediately and refresh once in the background.
    void startSnapshotRefresh();
    return cachedSnapshot.value;
  }
  return startSnapshotRefresh();
}

export function invalidateNativeStoreCache() {
  cachedSnapshot = null;
  hydratedProductCache.clear();
}

export function broadcastStorefrontRefresh() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STOREFRONT_REFRESH_STORAGE_KEY,
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  } catch {
    // Cross-tab refresh is best effort; the current tab still receives the event below.
  }

  window.dispatchEvent(new Event(STOREFRONT_REFRESH_EVENT));
}

function publicProducts(snapshot: NativeSnapshot) {
  return snapshot.products.map((entry) => entry.product);
}

export async function fetchCatalogProducts(first = 500): Promise<StoreProduct[]> {
  const products = publicProducts(await loadSnapshot());
  return products.slice(0, Math.max(0, first));
}

export async function fetchHomepageProducts(first = 48): Promise<StoreProduct[]> {
  if (first <= 0) return [];
  const productResult = await publicSupabase
    .from("store_products")
    .select(STOREFRONT_PRODUCT_SELECT)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(first);
  const rows = assertResult(productResult, "homepage products");
  return hydrateProductRows(rows);
}

export async function fetchBrandVendors(): Promise<string[]> {
  const snapshot = await loadSnapshot();
  const used = new Set(
    snapshot.products
      .map((entry) => entry.product.node.vendor?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return snapshot.brands.map((brand) => brand.name).filter((name) => used.has(name));
}

/**
 * Lightweight facets for global navigation.
 *
 * Header/menu rendering only needs category and brand metadata. Keep that
 * critical path independent from the full product snapshot so it never loads
 * variant or image tables merely to render navigation.
 */
export async function fetchNavigationCatalogFacets() {
  const [productResult, collectionResult, linkResult, brandResult] = await Promise.all([
    publicSupabase
      .from("store_products")
      .select(STOREFRONT_NAVIGATION_PRODUCT_SELECT)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_collections")
      .select(STOREFRONT_COLLECTION_SELECT)
      .eq("is_active", true),
    publicSupabase
      .from("store_collection_products")
      .select(STOREFRONT_COLLECTION_LINK_SELECT)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("cms_brands")
      .select(STOREFRONT_BRAND_SELECT)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
  ]);

  const productRows = assertResult(productResult, "navigation products") as NavigationProductRow[];
  const collectionRows = assertResult(collectionResult, "navigation collections");
  const links = assertResult(linkResult, "navigation collection links");
  const brands = assertResult(brandResult, "navigation brands");

  const collectionsById = new Map(collectionRows.map((row) => [row.id, row]));
  const linksByProduct = groupByProduct(links);
  const brandsById = new Map(brands.map((row) => [row.id, row]));

  const products: StoreProduct[] = productRows.map((row) => {
    const productCollections = (linksByProduct.get(row.id) ?? [])
      .map((link) => collectionsById.get(link.collection_id))
      .filter((collection): collection is StorefrontCollectionRow => Boolean(collection));

    return {
      node: {
        id: row.id,
        title: row.title,
        description: "",
        handle: row.handle,
        vendor: row.brand_id ? brandsById.get(row.brand_id)?.name : undefined,
        vendorSlug: row.brand_id ? brandsById.get(row.brand_id)?.slug : undefined,
        vendorHidden: Boolean(row.brand_id && !brandsById.get(row.brand_id)),
        productType: row.product_type ?? undefined,
        tags: row.tags,
        availableForSale: true,
        priceRange: { minVariantPrice: { amount: "0", currencyCode: "USD" } },
        images: { edges: [] },
        collections: {
          edges: productCollections.map((collection) => ({
            node: { handle: collection.handle, title: collection.title },
          })),
        },
        variants: { edges: [] },
        options: [],
      },
    };
  });

  const catalog = buildCatalogIndex(products);
  return { categories: catalog.categories, brands: catalog.brands };
}

export async function fetchProductByHandle(handle: string): Promise<StoreProduct | null> {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return null;

  const productResult = await publicSupabase
    .from("store_products")
      .select(STOREFRONT_PRODUCT_SELECT)
    .eq("handle", normalized)
    .eq("status", "active")
    .maybeSingle();
  if (productResult.error) {
    throw new Error(`Supabase product failed: ${productResult.error.message}`);
  }
  const row = productResult.data as StorefrontProductRow | null;
  if (!row) return null;

  const [variantResult, imageResult, linkResult, brandResult, categoryResult] = await Promise.all([
    publicSupabase
      .from("store_product_variants")
      .select(STOREFRONT_VARIANT_SELECT)
      .eq("product_id", row.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_product_images")
      .select(STOREFRONT_IMAGE_SELECT)
      .eq("product_id", row.id)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_collection_products")
      .select(STOREFRONT_COLLECTION_LINK_SELECT)
      .eq("product_id", row.id)
      .order("sort_order", { ascending: true }),
    row.brand_id
      ? publicSupabase
          .from("cms_brands")
          .select(STOREFRONT_BRAND_SELECT)
          .eq("id", row.brand_id)
          .eq("is_visible", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.category_id
      ? publicSupabase
          .from("store_categories")
          .select("spec_template")
          .eq("id", row.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const variants = assertResult(variantResult, "product variants");
  const images = assertResult(imageResult, "product images");
  const links = assertResult(linkResult, "product collection links");
  if (brandResult.error) {
    throw new Error(`Supabase product brand failed: ${brandResult.error.message}`);
  }
  if (categoryResult.error) {
    throw new Error(`Supabase product category failed: ${categoryResult.error.message}`);
  }

  const collectionIds = links.map((link) => link.collection_id);
  let collections: StorefrontCollectionRow[] = [];
  if (collectionIds.length) {
    const collectionResult = await publicSupabase
      .from("store_collections")
      .select(STOREFRONT_COLLECTION_SELECT)
      .in("id", collectionIds)
      .eq("is_active", true);
    collections = assertResult(collectionResult, "product collections");
    const order = new Map(links.map((link, index) => [link.collection_id, index]));
    collections.sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return buildProduct(
    row,
    variants,
    images,
    collections,
    (brandResult.data as StorefrontBrandRow | null) ?? undefined,
    parseTemplate(categoryResult.data?.spec_template),
  );
}

export async function fetchCollections(first = 100): Promise<StoreCollection[]> {
  const collectionResult = await publicSupabase
    .from("store_collections")
    .select(STOREFRONT_COLLECTION_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true })
    .limit(Math.max(0, first));

  const rows = assertResult(collectionResult, "collections");
  return rows.map(mapCollection);
}

const SMALL_COLLECTION_FAST_PATH_MAX = 12;

function mapCollection(row: StorefrontCollectionRow): StoreCollection {
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    image: row.image_url ? { url: row.image_url, altText: row.title } : null,
  };
}

async function fetchSmallCollectionByHandle(
  handle: string,
  pageSize: number,
): Promise<{ collection: StoreCollection; products: StoreProduct[] } | null> {
  const normalizedHandle = handle.trim().toLowerCase();
  if (!normalizedHandle) return null;

  const collectionResult = await publicSupabase
    .from("store_collections")
      .select(STOREFRONT_COLLECTION_SELECT)
    .eq("handle", normalizedHandle)
    .eq("is_active", true)
    .maybeSingle();
  if (collectionResult.error) {
    throw new Error(`Supabase collection failed: ${collectionResult.error.message}`);
  }

  const row = collectionResult.data as StorefrontCollectionRow | null;
  if (!row) return null;

  const collection = mapCollection(row);
  if (pageSize <= 0) return { collection, products: [] };

  const linkResult = await publicSupabase
    .from("store_collection_products")
      .select(STOREFRONT_COLLECTION_LINK_SELECT)
    .eq("collection_id", row.id)
    .order("sort_order", { ascending: true });
  const orderedLinks = assertResult(linkResult, "collection links");
  if (!orderedLinks.length) return { collection, products: [] };

  const linkedProductIds = [...new Set(orderedLinks.map((link) => link.product_id))];
  const productResult = await publicSupabase
    .from("store_products")
      .select(STOREFRONT_PRODUCT_SELECT)
    .in("id", linkedProductIds)
    .eq("status", "active");
  const productRows = assertResult(productResult, "collection products");
  const productRowsById = new Map(productRows.map((product) => [product.id, product]));
  const selectedRows = orderedLinks
    .map((link) => productRowsById.get(link.product_id))
    .filter((product): product is StorefrontProductRow => Boolean(product))
    .slice(0, pageSize);

  if (!selectedRows.length) return { collection, products: [] };

  const activeProductIds = selectedRows.map((product) => product.id);
  const [variantResult, imageResult, productLinkResult] = await Promise.all([
    publicSupabase
      .from("store_product_variants")
      .select(STOREFRONT_VARIANT_SELECT)
      .in("product_id", activeProductIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_product_images")
      .select(STOREFRONT_IMAGE_SELECT)
      .in("product_id", activeProductIds)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("store_collection_products")
      .select(STOREFRONT_COLLECTION_LINK_SELECT)
      .in("product_id", activeProductIds)
      .order("sort_order", { ascending: true }),
  ]);

  const variants = assertResult(variantResult, "collection product variants");
  const images = assertResult(imageResult, "collection product images");
  const productLinks = assertResult(productLinkResult, "collection product links");
  const variantsByProduct = groupByProduct(variants);
  const imagesByProduct = groupByProduct(images);
  const linksByProduct = groupByProduct(productLinks);

  const relatedCollectionIds = [
    ...new Set(productLinks.map((link) => link.collection_id).filter((id) => id !== row.id)),
  ];
  let relatedCollections: StorefrontCollectionRow[] = [];
  if (relatedCollectionIds.length) {
    const relatedCollectionResult = await publicSupabase
      .from("store_collections")
      .select(STOREFRONT_COLLECTION_SELECT)
      .in("id", relatedCollectionIds)
      .eq("is_active", true);
    relatedCollections = assertResult(relatedCollectionResult, "related collections");
  }
  const collectionsById = new Map<string, StorefrontCollectionRow>([
    [row.id, row],
    ...relatedCollections.map((related) => [related.id, related] as const),
  ]);

  const brandIds = [
    ...new Set(
      selectedRows
        .map((product) => product.brand_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  let brands: StorefrontBrandRow[] = [];
  if (brandIds.length) {
    const brandResult = await publicSupabase
      .from("cms_brands")
      .select(STOREFRONT_BRAND_SELECT)
      .in("id", brandIds)
      .eq("is_visible", true);
    brands = assertResult(brandResult, "collection product brands");
  }
  const brandsById = new Map(brands.map((brand) => [brand.id, brand]));

  const products = selectedRows.map((productRow) => {
    const productCollections = (linksByProduct.get(productRow.id) ?? [])
      .map((link) => collectionsById.get(link.collection_id))
      .filter((entry): entry is StorefrontCollectionRow => Boolean(entry));
    return buildProduct(
      productRow,
      variantsByProduct.get(productRow.id) ?? [],
      imagesByProduct.get(productRow.id) ?? [],
      productCollections,
      productRow.brand_id ? brandsById.get(productRow.brand_id) : undefined,
    );
  });

  return { collection, products };
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: StoreCollection; products: StoreProduct[] } | null> {
  if (pageSize <= SMALL_COLLECTION_FAST_PATH_MAX) {
    return fetchSmallCollectionByHandle(handle, pageSize);
  }

  const snapshot = await loadSnapshot();
  const row = snapshot.collections.find(
    (collection) => collection.handle.toLowerCase() === handle.trim().toLowerCase(),
  );
  if (!row) return null;

  const productIds = snapshot.links
    .filter((link) => link.collection_id === row.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((link) => link.product_id);
  const byId = new Map(snapshot.products.map((entry) => [entry.row.id, entry.product]));
  const products = productIds
    .map((id) => byId.get(id))
    .filter((product): product is StoreProduct => Boolean(product))
    .slice(0, Math.max(0, pageSize));

  return { collection: mapCollection(row), products };
}

export type HomepageProductSource =
  "best_sellers" | "newest" | "manual" | "collection" | "brand" | "category";

export async function fetchHomepageConfiguredProducts(config: {
  source: HomepageProductSource;
  sourceValue?: string;
  manualProductIds?: string[];
  count?: number;
}): Promise<StoreProduct[]> {
  const count = Math.min(10, Math.max(1, Math.trunc(config.count ?? 5)));
  const value = config.sourceValue?.trim() ?? "";

  if (config.source === "best_sellers") return fetchBestSellingProducts(count);
  if (config.source === "newest") return fetchNewestProducts(count);
  if (config.source === "manual") {
    return (await fetchProductsByIds(config.manualProductIds ?? [])).slice(0, count);
  }

  if (!value) return [];
  const normalized = value.toLowerCase();

  if (config.source === "brand") {
    const brandResult = await publicSupabase
      .from("cms_brands")
      .select("id,name,slug")
      .eq("is_visible", true);
    const brands = assertResult(brandResult, "homepage brand source");
    const brand = brands.find((row) =>
      [row.id, row.name, row.slug].some((entry) => entry.toLowerCase() === normalized),
    );
    if (!brand) return [];

    const productResult = await publicSupabase
      .from("store_products")
      .select(STOREFRONT_PRODUCT_SELECT)
      .eq("status", "active")
      .eq("brand_id", brand.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(count);
    return hydrateProductRows(assertResult(productResult, "homepage brand products"));
  }

  if (config.source === "category") {
    const categoryResult = await publicSupabase
      .from("store_categories")
      .select("id,name,slug")
      .eq("is_active", true);
    const categories = assertResult(categoryResult, "homepage category source");
    const category = categories.find((row) =>
      [row.id, row.name, row.slug].some((entry) => entry.toLowerCase() === normalized),
    );
    if (!category) return [];

    const productResult = await publicSupabase
      .from("store_products")
      .select(STOREFRONT_PRODUCT_SELECT)
      .eq("status", "active")
      .eq("category_id", category.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(count);
    return hydrateProductRows(assertResult(productResult, "homepage category products"));
  }

  const collectionResult = await publicSupabase
    .from("store_collections")
    .select("id,title,handle")
    .eq("is_active", true);
  const collections = assertResult(collectionResult, "homepage collection source");
  const collection = collections.find((row) =>
    [row.id, row.title, row.handle].some((entry) => entry.toLowerCase() === normalized),
  );
  if (!collection) return [];

  const linkResult = await publicSupabase
    .from("store_collection_products")
    .select("product_id")
    .eq("collection_id", collection.id)
    .order("sort_order", { ascending: true });
  const links = assertResult(linkResult, "homepage collection products");
  return (await fetchProductsByIds(links.map((row) => row.product_id))).slice(0, count);
}

export async function fetchNewestProducts(first = 12) {
  if (first <= 0) return [];
  const productResult = await publicSupabase
    .from("store_products")
    .select(STOREFRONT_PRODUCT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(first);
  return hydrateProductRows(assertResult(productResult, "newest products"));
}

export async function fetchBestSellingProducts(first = 12) {
  if (first <= 0) return [];
  const productResult = await publicSupabase
    .from("store_products")
    .select(STOREFRONT_PRODUCT_SELECT)
    .eq("status", "active")
    .eq("best_seller", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(first);
  return hydrateProductRows(assertResult(productResult, "best-selling products"));
}

export async function fetchProductsByVendor(vendor: string, first = 8) {
  const normalized = vendor.trim().toLowerCase();
  if (!normalized || first <= 0) return [];

  const brandResult = await publicSupabase
    .from("cms_brands")
    .select(STOREFRONT_BRAND_SELECT)
    .eq("is_visible", true);
  const brands = assertResult(brandResult, "vendor brands");
  const brand = brands.find((entry) => entry.name.trim().toLowerCase() === normalized);
  if (!brand) return [];

  const productQuery = publicSupabase
    .from("store_products")
    .select(STOREFRONT_PRODUCT_SELECT)
    .eq("status", "active")
    .eq("brand_id", brand.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const productResult =
    Number.isFinite(first) && first < Number.MAX_SAFE_INTEGER
      ? await productQuery.limit(first)
      : await productQuery;

  return hydrateProductRows(assertResult(productResult, "vendor products"));
}

export async function fetchAllProductsByVendor(vendor: string) {
  return fetchProductsByVendor(vendor, Number.MAX_SAFE_INTEGER);
}

export async function fetchProductsByIds(ids: string[]) {
  const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const order = new Map(normalizedIds.map((id, index) => [id, index]));
  if (!order.size) return [];

  const productResult = await publicSupabase
    .from("store_products")
    .select(STOREFRONT_PRODUCT_SELECT)
    .in("id", normalizedIds)
    .eq("status", "active");
  const products = await hydrateProductRows(assertResult(productResult, "products by ids"));
  return products.sort(
    (a, b) =>
      (order.get(a.node.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.node.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function fetchProductsByHandles(handles: string[]) {
  const normalizedHandles = [
    ...new Set(handles.map((handle) => handle.trim().toLowerCase()).filter(Boolean)),
  ];
  const order = new Map(normalizedHandles.map((handle, index) => [handle.toLowerCase(), index]));
  if (!order.size) return [];

  const productResult = await publicSupabase
    .from("store_products")
    .select(STOREFRONT_PRODUCT_SELECT)
    .in("handle", normalizedHandles)
    .eq("status", "active");
  const products = await hydrateProductRows(assertResult(productResult, "products by handles"));
  return products.sort(
    (a, b) =>
      (order.get(a.node.handle.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.node.handle.toLowerCase()) ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function fetchProductRecommendations(handle: string, first = 8) {
  const snapshot = await loadSnapshot();
  const current = snapshot.products.find((entry) => entry.product.node.handle === handle);
  if (!current) return [];

  const vendor = current.product.node.vendor?.toLowerCase();
  const type = current.product.node.productType?.toLowerCase();
  return snapshot.products
    .filter((entry) => entry.product.node.handle !== handle)
    .map((entry) => ({
      product: entry.product,
      score:
        (type && entry.product.node.productType?.toLowerCase() === type ? 2 : 0) +
        (vendor && entry.product.node.vendor?.toLowerCase() === vendor ? 1 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.node.title.localeCompare(b.product.node.title, "en", { numeric: true }),
    )
    .slice(0, first)
    .map((entry) => entry.product);
}

export async function searchStorefront(term: string) {
  const normalized = term.trim();
  if (!normalized) {
    return { products: [] as StoreProduct[], collections: [] as StoreCollection[] };
  }

  const snapshot = await loadSnapshot();
  const products = publicProducts(snapshot)
    .map((product) => ({ product, score: productSearchScore(product, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.node.title.localeCompare(b.product.node.title, "en", {
          numeric: true,
          sensitivity: "base",
        }),
    )
    .map((entry) => entry.product);

  const collections = (await fetchCollections(500))
    .map((collection) => ({
      collection,
      score: textSearchScore(normalized, collection.title, [
        collection.handle,
        collection.description,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.collection.title.localeCompare(b.collection.title, "en", {
          numeric: true,
          sensitivity: "base",
        }),
    )
    .map((entry) => entry.collection);

  return { products, collections };
}
