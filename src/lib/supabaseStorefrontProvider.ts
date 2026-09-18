import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { fetchCmsSnapshot } from "@/lib/cms";
import type { StoreCollection, StoreProduct, StoreProductNode } from "@/lib/storefrontTypes";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;
type CategoryRow = Tables<"store_categories">;
type CollectionRow = Tables<"store_collections">;
type CollectionProductRow = Tables<"store_collection_products">;

type ProductSortKey = "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE";

type HydrationContext = {
  variants: Map<string, VariantRow[]>;
  images: Map<string, ImageRow[]>;
  categories: Map<string, CategoryRow>;
  collections: Map<string, Array<{ handle: string; title: string }>>;
  brands: Map<string, string>;
};

const MAX_PAGE = 100;

function bounded(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_PAGE);
}

function publicProductsQuery() {
  return supabase
    .from("store_products")
    .select("*")
    .eq("status", "active")
    .lte("published_at", new Date().toISOString());
}

function groupByProduct<T extends { product_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const current = grouped.get(row.product_id) ?? [];
    current.push(row);
    grouped.set(row.product_id, current);
  }
  return grouped;
}

function optionRecord(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function selectedOptions(value: Json) {
  return Object.entries(optionRecord(value))
    .filter(([, option]) => typeof option === "string" || typeof option === "number")
    .map(([name, option]) => ({ name, value: String(option) }));
}

function productOptions(variants: VariantRow[]) {
  const values = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const option of selectedOptions(variant.options)) {
      const set = values.get(option.name) ?? new Set<string>();
      set.add(option.value);
      values.set(option.name, set);
    }
  }

  return [...values.entries()].map(([name, optionValues]) => ({
    name,
    values: [...optionValues],
  }));
}

function variantAvailable(variant: VariantRow) {
  return (
    variant.is_active &&
    (!variant.track_inventory || variant.stock_quantity > 0 || variant.allow_backorder)
  );
}

function mapProduct(row: ProductRow, context: HydrationContext): StoreProduct {
  const variants = (context.variants.get(row.id) ?? [])
    .filter((variant) => variant.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const images = (context.images.get(row.id) ?? []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );

  const category = row.category_id ? context.categories.get(row.category_id) : undefined;
  const productType = row.product_type || category?.name || undefined;
  const vendor = row.brand_id ? context.brands.get(row.brand_id) : undefined;
  const currency = row.currency || "USD";

  const variantPrices = variants.map((variant) => Number(variant.price)).filter(Number.isFinite);
  const minPrice = variantPrices.length
    ? Math.min(...variantPrices)
    : Number(row.base_price || 0);

  const comparePrices = variants
    .map((variant) => variant.compare_at_price)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const minCompare = comparePrices.length
    ? Math.min(...comparePrices)
    : row.compare_at_price !== null
      ? Number(row.compare_at_price)
      : null;

  const availableForSale = variants.length
    ? variants.some(variantAvailable)
    : !row.track_inventory || row.stock_quantity > 0 || row.allow_backorder;

  const node: StoreProductNode = {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    ...(row.description_html ? { descriptionHtml: row.description_html } : {}),
    handle: row.handle,
    ...(vendor ? { vendor } : {}),
    ...(productType ? { productType } : {}),
    availableForSale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tags ?? [],
    priceRange: {
      minVariantPrice: { amount: minPrice.toFixed(2), currencyCode: currency },
    },
    ...(minCompare !== null
      ? {
          compareAtPriceRange: {
            minVariantPrice: { amount: minCompare.toFixed(2), currencyCode: currency },
          },
        }
      : {}),
    images: {
      edges: images.map((image) => ({
        node: { url: image.url, altText: image.alt_text },
      })),
    },
    collections: {
      edges: (context.collections.get(row.id) ?? []).map((collection) => ({
        node: collection,
      })),
    },
    variants: {
      edges: variants.map((variant) => ({
        node: {
          id: variant.id,
          title: variant.title,
          price: {
            amount: Number(variant.price).toFixed(2),
            currencyCode: currency,
          },
          compareAtPrice:
            variant.compare_at_price === null
              ? null
              : {
                  amount: Number(variant.compare_at_price).toFixed(2),
                  currencyCode: currency,
                },
          availableForSale: variantAvailable(variant),
          sku: variant.sku,
          barcode: variant.barcode,
          image: variant.image_url
            ? { url: variant.image_url, altText: `${row.title} — ${variant.title}` }
            : null,
          selectedOptions: selectedOptions(variant.options),
        },
      })),
    },
    options: productOptions(variants),
  };

  // A product created from the Dashboard may intentionally have no variants yet.
  // Preserve a usable primary variant so existing cards/cart UI stays functional.
  if (!node.variants.edges.length) {
    node.variants.edges.push({
      node: {
        id: `${row.id}:default`,
        title: "Default",
        price: { amount: Number(row.base_price || 0).toFixed(2), currencyCode: currency },
        compareAtPrice:
          row.compare_at_price === null
            ? null
            : {
                amount: Number(row.compare_at_price).toFixed(2),
                currencyCode: currency,
              },
        availableForSale,
        sku: row.sku,
        barcode: row.barcode,
        image: images[0]
          ? { url: images[0].url, altText: images[0].alt_text }
          : null,
        selectedOptions: [],
      },
    });
  }

  return { node };
}

async function hydrateProducts(rows: ProductRow[]): Promise<StoreProduct[]> {
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const categoryIds = [
    ...new Set(rows.flatMap((row) => (row.category_id ? [row.category_id] : []))),
  ];

  const [variantsResult, imagesResult, categoriesResult, membershipResult, cms] =
    await Promise.all([
      supabase
        .from("store_product_variants")
        .select("*")
        .in("product_id", ids)
        .order("sort_order"),
      supabase
        .from("store_product_images")
        .select("*")
        .in("product_id", ids)
        .order("sort_order"),
      categoryIds.length
        ? supabase
            .from("store_categories")
            .select("*")
            .in("id", categoryIds)
        : Promise.resolve({ data: [] as CategoryRow[], error: null }),
      supabase
        .from("store_collection_products")
        .select("*")
        .in("product_id", ids)
        .order("sort_order"),
      fetchCmsSnapshot(),
    ]);

  const firstError =
    variantsResult.error ||
    imagesResult.error ||
    categoriesResult.error ||
    membershipResult.error;
  if (firstError) throw firstError;

  const memberships = (membershipResult.data ?? []) as CollectionProductRow[];
  const collectionIds = [...new Set(memberships.map((row) => row.collection_id))];
  const collectionsResult = collectionIds.length
    ? await supabase
        .from("store_collections")
        .select("*")
        .in("id", collectionIds)
    : { data: [] as CollectionRow[], error: null };
  if (collectionsResult.error) throw collectionsResult.error;

  const collectionLookup = new Map(
    (collectionsResult.data ?? []).map((collection) => [collection.id, collection]),
  );
  const collectionsByProduct = new Map<
    string,
    Array<{ handle: string; title: string }>
  >();

  for (const membership of memberships) {
    const collection = collectionLookup.get(membership.collection_id);
    if (!collection) continue;
    const current = collectionsByProduct.get(membership.product_id) ?? [];
    current.push({ handle: collection.handle, title: collection.title });
    collectionsByProduct.set(membership.product_id, current);
  }

  const context: HydrationContext = {
    variants: groupByProduct((variantsResult.data ?? []) as VariantRow[]),
    images: groupByProduct((imagesResult.data ?? []) as ImageRow[]),
    categories: new Map(
      ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [
        category.id,
        category,
      ]),
    ),
    collections: collectionsByProduct,
    brands: new Map(
      cms.brands
        .filter((brand) => brand.is_visible)
        .map((brand) => [brand.id, brand.name]),
    ),
  };

  return rows.map((row) => mapProduct(row, context));
}

export async function hasPublishedProducts() {
  const { data, error } = await publicProductsQuery().select("id").limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function fetchProducts(
  first = 30,
  query?: string,
  sortKey?: ProductSortKey,
  reverse?: boolean,
): Promise<StoreProduct[]> {
  let request = publicProductsQuery();

  if (sortKey === "BEST_SELLING") {
    request = request
      .order("best_seller", { ascending: false })
      .order("sort_order", { ascending: true });
  } else if (sortKey === "CREATED_AT") {
    request = request.order("created_at", { ascending: !reverse });
  } else if (sortKey === "PRICE") {
    request = request.order("base_price", { ascending: !reverse });
  } else if (sortKey === "TITLE") {
    request = request.order("title", { ascending: !reverse });
  } else {
    request = request
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true });
  }

  const limit = query?.trim() ? MAX_PAGE : bounded(first, 30);
  const { data, error } = await request.limit(limit);
  if (error) throw error;

  let products = await hydrateProducts((data ?? []) as ProductRow[]);
  const term = query?.trim().toLowerCase();
  if (term) {
    products = products.filter((product) => {
      const node = product.node;
      return [
        node.title,
        node.handle,
        node.vendor ?? "",
        node.productType ?? "",
        ...(node.tags ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }

  return products.slice(0, bounded(first, 30));
}

export function fetchCatalogProducts(first = 60) {
  return fetchProducts(first);
}

export function fetchBestSellingProducts(first = 12) {
  return fetchProducts(first, undefined, "BEST_SELLING");
}

export async function fetchBrandVendors(): Promise<string[]> {
  const { data, error } = await publicProductsQuery().select("brand_id");
  if (error) throw error;

  const ids = new Set(
    (data ?? []).flatMap((row) => (row.brand_id ? [row.brand_id] : [])),
  );
  if (!ids.size) return [];

  const cms = await fetchCmsSnapshot();
  return cms.brands
    .filter((brand) => brand.is_visible && ids.has(brand.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((brand) => brand.name);
}

export async function fetchProductByHandle(handle: string): Promise<StoreProduct | null> {
  const { data, error } = await publicProductsQuery().eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await hydrateProducts([data]))[0] ?? null;
}

export async function fetchCollections(first = 50): Promise<StoreCollection[]> {
  const { data, error } = await supabase
    .from("store_collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("title")
    .limit(bounded(first, 50));
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description ?? "",
    image: row.image_url ? { url: row.image_url, altText: row.title } : null,
    updatedAt: row.updated_at,
  }));
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: StoreCollection; products: StoreProduct[] } | null> {
  const { data: collection, error: collectionError } = await supabase
    .from("store_collections")
    .select("*")
    .eq("handle", handle)
    .eq("is_active", true)
    .maybeSingle();
  if (collectionError) throw collectionError;
  if (!collection) return null;

  const { data: memberships, error: membershipsError } = await supabase
    .from("store_collection_products")
    .select("*")
    .eq("collection_id", collection.id)
    .order("sort_order")
    .limit(bounded(pageSize, 48));
  if (membershipsError) throw membershipsError;

  const ids = (memberships ?? []).map((row) => row.product_id);
  let products: StoreProduct[] = [];

  if (ids.length) {
    const { data, error } = await publicProductsQuery().in("id", ids);
    if (error) throw error;
    const rowsById = new Map((data ?? []).map((row) => [row.id, row]));
    const ordered = ids.flatMap((id) => {
      const row = rowsById.get(id);
      return row ? [row] : [];
    });
    products = await hydrateProducts(ordered);
  }

  return {
    collection: {
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      description: collection.description ?? "",
      image: collection.image_url
        ? { url: collection.image_url, altText: collection.title }
        : null,
      updatedAt: collection.updated_at,
    },
    products,
  };
}

async function brandIdForVendor(vendor: string) {
  const normalized = vendor.trim().toLowerCase();
  if (!normalized) return null;
  const cms = await fetchCmsSnapshot();
  return (
    cms.brands.find(
      (brand) =>
        brand.is_visible && brand.name.trim().toLowerCase() === normalized,
    )?.id ?? null
  );
}

export async function fetchProductsByVendor(vendor: string, first = 8) {
  const brandId = await brandIdForVendor(vendor);
  if (!brandId) return [];

  const { data, error } = await publicProductsQuery()
    .eq("brand_id", brandId)
    .order("sort_order")
    .limit(bounded(first, 8));
  if (error) throw error;
  return hydrateProducts(data ?? []);
}

export function fetchAllProductsByVendor(vendor: string) {
  return fetchProductsByVendor(vendor, MAX_PAGE);
}

export async function fetchProductsByHandles(handles: string[], first = 20) {
  const unique = [
    ...new Set(handles.map((handle) => handle.trim()).filter(Boolean)),
  ].slice(0, bounded(first, 20));
  if (!unique.length) return [];

  const { data, error } = await publicProductsQuery().in("handle", unique);
  if (error) throw error;

  const rowsByHandle = new Map((data ?? []).map((row) => [row.handle, row]));
  return hydrateProducts(
    unique.flatMap((handle) => {
      const row = rowsByHandle.get(handle);
      return row ? [row] : [];
    }),
  );
}

export async function fetchProductRecommendations(handle: string) {
  const product = await fetchProductByHandle(handle);
  if (!product) return [];

  if (product.node.vendor) {
    const sameBrand = await fetchProductsByVendor(product.node.vendor, 10);
    const filtered = sameBrand
      .filter((candidate) => candidate.node.handle !== handle)
      .slice(0, 8);
    if (filtered.length) return filtered;
  }

  const products = await fetchProducts(12);
  return products
    .filter((candidate) => candidate.node.handle !== handle)
    .slice(0, 8);
}

export async function searchStorefront(term: string) {
  const trimmed = term.trim();
  if (!trimmed) {
    return {
      products: [] as StoreProduct[],
      collections: [] as StoreCollection[],
    };
  }

  const [products, collections] = await Promise.all([
    fetchProducts(20, trimmed),
    fetchCollections(100),
  ]);
  const lowered = trimmed.toLowerCase();

  return {
    products,
    collections: collections.filter(
      (collection) =>
        collection.title.toLowerCase().includes(lowered) ||
        collection.handle.toLowerCase().includes(lowered) ||
        collection.description.toLowerCase().includes(lowered),
    ),
  };
}
