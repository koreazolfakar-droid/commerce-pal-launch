import { supabase } from "@/integrations/supabase/client";
import type { ShopifyCollection, ShopifyProduct, ShopifyProductNode } from "@/lib/shopify";

type ProductDbRow = {
  id: string;
  title: string;
  handle: string;
  description: string;
  description_html: string | null;
  brand_id: string | null;
  category_id: string | null;
  product_type: string | null;
  status: "draft" | "active" | "archived";
  currency: string;
  base_price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  featured: boolean;
  best_seller: boolean;
  tags: string[];
  created_at: string;
  published_at: string | null;
  sort_order: number;
};

type VariantDbRow = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  options: Record<string, unknown>;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type ImageDbRow = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

type BrandDbRow = { id: string; name: string; slug: string };
type CategoryDbRow = { id: string; name: string; slug: string };
type CollectionDbRow = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};
type CollectionProductRow = { collection_id: string; product_id: string; sort_order: number };

type HydrationContext = {
  variants: Map<string, VariantDbRow[]>;
  images: Map<string, ImageDbRow[]>;
  brands: Map<string, BrandDbRow>;
  categories: Map<string, CategoryDbRow>;
  collections: Map<string, Array<{ handle: string; title: string }>>;
};

const MAX_PAGE = 100;

function groupByProduct<T extends { product_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const current = grouped.get(row.product_id) ?? [];
    current.push(row);
    grouped.set(row.product_id, current);
  }
  return grouped;
}

function selectedOptions(options: Record<string, unknown> | null | undefined) {
  if (!options) return [];
  return Object.entries(options)
    .filter(([, value]) => typeof value === "string" || typeof value === "number")
    .map(([name, value]) => ({ name, value: String(value) }));
}

function productOptions(variants: VariantDbRow[]) {
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

function variantAvailable(variant: VariantDbRow) {
  return (
    variant.is_active &&
    (!variant.track_inventory || variant.stock_quantity > 0 || variant.allow_backorder)
  );
}

function mapProduct(row: ProductDbRow, context: HydrationContext): ShopifyProduct {
  const variants = (context.variants.get(row.id) ?? [])
    .filter((variant) => variant.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const images = (context.images.get(row.id) ?? []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const brand = row.brand_id ? context.brands.get(row.brand_id) : undefined;
  const category = row.category_id ? context.categories.get(row.category_id) : undefined;
  const productType = row.product_type || category?.name || null;
  const currency = row.currency || "USD";
  const activePrices = variants.map((variant) => Number(variant.price)).filter(Number.isFinite);
  const minPrice = activePrices.length ? Math.min(...activePrices) : Number(row.base_price || 0);
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

  const node: ShopifyProductNode = {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    ...(row.description_html ? { descriptionHtml: row.description_html } : {}),
    handle: row.handle,
    ...(brand?.name ? { vendor: brand.name } : {}),
    ...(productType ? { productType } : {}),
    availableForSale,
    createdAt: row.created_at,
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
      edges: (context.collections.get(row.id) ?? []).map((collection) => ({ node: collection })),
    },
    variants: {
      edges: variants.map((variant) => ({
        node: {
          id: variant.id,
          title: variant.title,
          price: { amount: Number(variant.price).toFixed(2), currencyCode: currency },
          ...(variant.compare_at_price !== null
            ? {
                compareAtPrice: {
                  amount: Number(variant.compare_at_price).toFixed(2),
                  currencyCode: currency,
                },
              }
            : { compareAtPrice: null }),
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

  return { node };
}

async function hydrateProducts(rows: ProductDbRow[]): Promise<ShopifyProduct[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const brandIds = [...new Set(rows.flatMap((row) => (row.brand_id ? [row.brand_id] : [])))];
  const categoryIds = [...new Set(rows.flatMap((row) => (row.category_id ? [row.category_id] : [])))];

  const [variantResult, imageResult, brandResult, categoryResult, membershipResult] = await Promise.all([
    supabase
      .from("store_product_variants" as never)
      .select("*")
      .in("product_id", ids)
      .order("sort_order"),
    supabase
      .from("store_product_images" as never)
      .select("*")
      .in("product_id", ids)
      .order("sort_order"),
    brandIds.length
      ? supabase.from("cms_brands" as never).select("id,name,slug").in("id", brandIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? supabase.from("store_categories" as never).select("id,name,slug").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("store_collection_products" as never)
      .select("collection_id,product_id,sort_order")
      .in("product_id", ids),
  ]);

  const firstError =
    variantResult.error ||
    imageResult.error ||
    brandResult.error ||
    categoryResult.error ||
    membershipResult.error;
  if (firstError) throw firstError;

  const memberships = (membershipResult.data ?? []) as CollectionProductRow[];
  const collectionIds = [...new Set(memberships.map((row) => row.collection_id))];
  const collectionResult = collectionIds.length
    ? await supabase
        .from("store_collections" as never)
        .select("id,handle,title")
        .in("id", collectionIds)
    : { data: [], error: null };
  if (collectionResult.error) throw collectionResult.error;

  const collectionLookup = new Map(
    ((collectionResult.data ?? []) as Array<{ id: string; handle: string; title: string }>).map(
      (collection) => [collection.id, collection],
    ),
  );
  const collectionsByProduct = new Map<string, Array<{ handle: string; title: string }>>();
  for (const membership of memberships.sort((a, b) => a.sort_order - b.sort_order)) {
    const collection = collectionLookup.get(membership.collection_id);
    if (!collection) continue;
    const current = collectionsByProduct.get(membership.product_id) ?? [];
    current.push({ handle: collection.handle, title: collection.title });
    collectionsByProduct.set(membership.product_id, current);
  }

  const context: HydrationContext = {
    variants: groupByProduct((variantResult.data ?? []) as VariantDbRow[]),
    images: groupByProduct((imageResult.data ?? []) as ImageDbRow[]),
    brands: new Map(((brandResult.data ?? []) as BrandDbRow[]).map((brand) => [brand.id, brand])),
    categories: new Map(
      ((categoryResult.data ?? []) as CategoryDbRow[]).map((category) => [category.id, category]),
    ),
    collections: collectionsByProduct,
  };

  return rows.map((row) => mapProduct(row, context));
}

function publicProductsQuery() {
  return supabase
    .from("store_products" as never)
    .select("*")
    .eq("status", "active")
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);
}

export async function fetchProducts(
  first = 30,
  query?: string,
  sortKey?: "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE",
  reverse?: boolean,
): Promise<ShopifyProduct[]> {
  let request = publicProductsQuery();
  const trimmed = query?.trim();
  if (trimmed) {
    const safe = trimmed.replace(/[,%]/g, " ");
    request = request.or(
      `title.ilike.%${safe}%,handle.ilike.%${safe}%,product_type.ilike.%${safe}%`,
    );
  }

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

  const { data, error } = await request.limit(Math.min(Math.max(first, 1), MAX_PAGE));
  if (error) throw error;
  return hydrateProducts((data ?? []) as ProductDbRow[]);
}

export function fetchCatalogProducts(first = 60) {
  return fetchProducts(Math.min(Math.max(first, 1), MAX_PAGE));
}

export async function fetchBestSellingProducts(first = 12) {
  return fetchProducts(first, undefined, "BEST_SELLING");
}

export async function fetchBrandVendors(): Promise<string[]> {
  const { data: productRows, error: productError } = await supabase
    .from("store_products" as never)
    .select("brand_id")
    .eq("status", "active")
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);
  if (productError) throw productError;
  const brandIds = [
    ...new Set(
      ((productRows ?? []) as Array<{ brand_id: string | null }>).flatMap((row) =>
        row.brand_id ? [row.brand_id] : [],
      ),
    ),
  ];
  if (!brandIds.length) return [];
  const { data, error } = await supabase
    .from("cms_brands" as never)
    .select("id,name")
    .in("id", brandIds)
    .eq("is_visible", true);
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; name: string }>).map((brand) => brand.name);
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const { data, error } = await publicProductsQuery().eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await hydrateProducts([data as ProductDbRow]))[0] ?? null;
}

export async function fetchCollections(first = 50): Promise<ShopifyCollection[]> {
  const { data, error } = await supabase
    .from("store_collections" as never)
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(Math.min(Math.max(first, 1), MAX_PAGE));
  if (error) throw error;
  return ((data ?? []) as CollectionDbRow[]).map((row) => ({
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description ?? "",
    image: row.image_url ? { url: row.image_url, altText: row.title } : null,
  }));
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
  const { data: collectionData, error: collectionError } = await supabase
    .from("store_collections" as never)
    .select("*")
    .eq("handle", handle)
    .eq("is_active", true)
    .maybeSingle();
  if (collectionError) throw collectionError;
  if (!collectionData) return null;
  const collection = collectionData as CollectionDbRow;

  const { data: memberships, error: membershipError } = await supabase
    .from("store_collection_products" as never)
    .select("product_id,sort_order")
    .eq("collection_id", collection.id)
    .order("sort_order")
    .limit(Math.min(Math.max(pageSize, 1), MAX_PAGE));
  if (membershipError) throw membershipError;
  const ids = ((memberships ?? []) as Array<{ product_id: string }>).map((row) => row.product_id);
  let products: ShopifyProduct[] = [];
  if (ids.length) {
    const { data, error } = await publicProductsQuery().in("id", ids);
    if (error) throw error;
    const byId = new Map(((data ?? []) as ProductDbRow[]).map((row) => [row.id, row]));
    const ordered = ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
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
    },
    products,
  };
}

export async function fetchProductsByVendor(
  vendor: string,
  first = 8,
): Promise<ShopifyProduct[]> {
  const { data: brand, error: brandError } = await supabase
    .from("cms_brands" as never)
    .select("id")
    .ilike("name", vendor.trim())
    .maybeSingle();
  if (brandError) throw brandError;
  if (!brand) return [];
  const { data, error } = await publicProductsQuery()
    .eq("brand_id", (brand as { id: string }).id)
    .order("sort_order")
    .limit(Math.min(Math.max(first, 1), MAX_PAGE));
  if (error) throw error;
  return hydrateProducts((data ?? []) as ProductDbRow[]);
}

export function fetchAllProductsByVendor(vendor: string) {
  return fetchProductsByVendor(vendor, MAX_PAGE);
}

export async function fetchProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
  const unique = [...new Set(handles.map((handle) => handle.trim()).filter(Boolean))].slice(
    0,
    MAX_PAGE,
  );
  if (!unique.length) return [];
  const { data, error } = await publicProductsQuery().in("handle", unique);
  if (error) throw error;
  const byHandle = new Map(((data ?? []) as ProductDbRow[]).map((row) => [row.handle, row]));
  return hydrateProducts(
    unique.flatMap((handle) => {
      const product = byHandle.get(handle);
      return product ? [product] : [];
    }),
  );
}

export async function fetchProductRecommendations(handle: string): Promise<ShopifyProduct[]> {
  const product = await fetchProductByHandle(handle);
  if (!product) return [];
  const vendor = product.node.vendor?.trim();
  if (vendor) {
    const vendorProducts = await fetchProductsByVendor(vendor, 10);
    const filtered = vendorProducts.filter((item) => item.node.handle !== handle).slice(0, 8);
    if (filtered.length) return filtered;
  }
  const products = await fetchProducts(12);
  return products.filter((item) => item.node.handle !== handle).slice(0, 8);
}

export async function searchStorefront(term: string) {
  const trimmed = term.trim();
  if (!trimmed) {
    return { products: [] as ShopifyProduct[], collections: [] as ShopifyCollection[] };
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
        collection.handle.toLowerCase().includes(lowered),
    ),
  };
}
