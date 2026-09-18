import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;
type CollectionRow = Tables<"store_collections">;
type CollectionLinkRow = Tables<"store_collection_products">;
type BrandRow = Tables<"cms_brands">;

type NativeProduct = {
  product: ShopifyProduct;
  row: ProductRow;
};

type NativeSnapshot = {
  products: NativeProduct[];
  collections: CollectionRow[];
  links: CollectionLinkRow[];
  brands: BrandRow[];
};

const CACHE_TTL_MS = 30_000;
let cachedSnapshot: { expiresAt: number; value: NativeSnapshot } | null = null;
let pendingSnapshot: Promise<NativeSnapshot> | null = null;

function assertResult<T>(
  result: { data: T | null; error: { message: string } | null },
  label: string,
): T {
  if (result.error) throw new Error(`Supabase ${label} failed: ${result.error.message}`);
  if (result.data === null) throw new Error(`Supabase ${label} returned no data`);
  return result.data;
}

function optionEntries(value: Json): Array<{ name: string; value: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .filter((entry): entry is [string, string | number | boolean] =>
      ["string", "number", "boolean"].includes(typeof entry[1]),
    )
    .map(([name, raw]) => ({ name, value: String(raw) }));
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
  row: ProductRow,
  variants: VariantRow[],
  images: ImageRow[],
  collections: CollectionRow[],
  brand?: BrandRow,
): ShopifyProduct {
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

  const optionValues = new Map<string, string[]>();
  for (const variant of sortedVariants) {
    for (const option of optionEntries(variant.options)) {
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
        sku: variant.sku,
        barcode: variant.barcode,
        image: variant.image_url ? { url: variant.image_url, altText: null } : null,
        selectedOptions: optionEntries(variant.options),
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
      handle: row.handle,
      vendor: brand?.name,
      productType: row.product_type ?? undefined,
      availableForSale,
      createdAt: row.created_at,
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

async function loadSnapshot(): Promise<NativeSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && cachedSnapshot.expiresAt > now) return cachedSnapshot.value;
  if (pendingSnapshot) return pendingSnapshot;

  pendingSnapshot = (async () => {
    const [productResult, variantResult, imageResult, collectionResult, linkResult, brandResult] =
      await Promise.all([
        supabase
          .from("store_products")
          .select("*")
          .eq("status", "active")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("store_product_variants")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("store_product_images")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("store_collections")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("title", { ascending: true }),
        supabase.from("store_collection_products").select("*").order("sort_order", { ascending: true }),
        supabase
          .from("cms_brands")
          .select("*")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),
      ]);

    const productRows = assertResult(productResult, "products");
    const variantRows = assertResult(variantResult, "variants");
    const imageRows = assertResult(imageResult, "images");
    const collectionRows = assertResult(collectionResult, "collections");
    const links = assertResult(linkResult, "collection links");
    const brands = assertResult(brandResult, "brands");

    const variantsByProduct = groupByProduct(variantRows);
    const imagesByProduct = groupByProduct(imageRows);
    const linksByProduct = groupByProduct(links);
    const collectionsById = new Map(collectionRows.map((row) => [row.id, row]));
    const brandsById = new Map(brands.map((row) => [row.id, row]));

    const products: NativeProduct[] = productRows.map((row) => {
      const productCollections = (linksByProduct.get(row.id) ?? [])
        .map((link) => collectionsById.get(link.collection_id))
        .filter((collection): collection is CollectionRow => Boolean(collection));
      return {
        row,
        product: buildProduct(
          row,
          variantsByProduct.get(row.id) ?? [],
          imagesByProduct.get(row.id) ?? [],
          productCollections,
          row.brand_id ? brandsById.get(row.brand_id) : undefined,
        ),
      };
    });

    const value = { products, collections: collectionRows, links, brands };
    cachedSnapshot = { expiresAt: Date.now() + CACHE_TTL_MS, value };
    return value;
  })();

  try {
    return await pendingSnapshot;
  } finally {
    pendingSnapshot = null;
  }
}

export function invalidateNativeStoreCache() {
  cachedSnapshot = null;
}

function publicProducts(snapshot: NativeSnapshot) {
  return snapshot.products.map((entry) => entry.product);
}

export async function fetchCatalogProducts(first = 500): Promise<ShopifyProduct[]> {
  const products = publicProducts(await loadSnapshot());
  return products.slice(0, Math.max(0, first));
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

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const normalized = handle.trim().toLowerCase();
  const snapshot = await loadSnapshot();
  return (
    snapshot.products.find((entry) => entry.product.node.handle.toLowerCase() === normalized)
      ?.product ?? null
  );
}

export async function fetchCollections(first = 100): Promise<ShopifyCollection[]> {
  const snapshot = await loadSnapshot();
  return snapshot.collections.slice(0, Math.max(0, first)).map((row) => ({
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    image: row.image_url ? { url: row.image_url, altText: row.title } : null,
  }));
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
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
    .filter((product): product is ShopifyProduct => Boolean(product))
    .slice(0, Math.max(0, pageSize));

  return {
    collection: {
      id: row.id,
      handle: row.handle,
      title: row.title,
      description: row.description,
      image: row.image_url ? { url: row.image_url, altText: row.title } : null,
    },
    products,
  };
}

export async function fetchNewestProducts(first = 12) {
  const snapshot = await loadSnapshot();
  return [...snapshot.products]
    .sort(
      (a, b) =>
        new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime() ||
        a.row.sort_order - b.row.sort_order,
    )
    .slice(0, first)
    .map((entry) => entry.product);
}

export async function fetchBestSellingProducts(first = 12) {
  const snapshot = await loadSnapshot();
  return snapshot.products
    .filter((entry) => entry.row.best_seller)
    .sort((a, b) => a.row.sort_order - b.row.sort_order)
    .slice(0, first)
    .map((entry) => entry.product);
}

export async function fetchProductsByVendor(vendor: string, first = 8) {
  const normalized = vendor.trim().toLowerCase();
  if (!normalized) return [];
  const products = publicProducts(await loadSnapshot()).filter(
    (product) => product.node.vendor?.trim().toLowerCase() === normalized,
  );
  return products.slice(0, first);
}

export async function fetchAllProductsByVendor(vendor: string) {
  return fetchProductsByVendor(vendor, Number.MAX_SAFE_INTEGER);
}

export async function fetchProductsByHandles(handles: string[]) {
  const order = new Map(
    [...new Set(handles.map((handle) => handle.trim()).filter(Boolean))].map((handle, index) => [
      handle.toLowerCase(),
      index,
    ]),
  );
  if (!order.size) return [];
  return publicProducts(await loadSnapshot())
    .filter((product) => order.has(product.node.handle.toLowerCase()))
    .sort(
      (a, b) =>
        (order.get(a.node.handle.toLowerCase()) ?? 0) -
        (order.get(b.node.handle.toLowerCase()) ?? 0),
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
  const normalized = term.trim().toLowerCase();
  if (!normalized) return { products: [] as ShopifyProduct[], collections: [] as ShopifyCollection[] };

  const words = normalized.split(/\s+/).filter(Boolean);
  const snapshot = await loadSnapshot();
  const products = publicProducts(snapshot).filter((product) => {
    const node = product.node;
    const variantText = node.variants.edges
      .map((edge) =>
        [
          edge.node.sku ?? "",
          edge.node.barcode ?? "",
          ...edge.node.selectedOptions.map((option) => option.value),
        ].join(" "),
      )
      .join(" ");
    const haystack = [
      node.title,
      node.description,
      node.vendor ?? "",
      node.productType ?? "",
      ...(node.tags ?? []),
      variantText,
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  const collections = (await fetchCollections(500)).filter((collection) => {
    const haystack = `${collection.title} ${collection.handle} ${collection.description}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  return { products, collections };
}
