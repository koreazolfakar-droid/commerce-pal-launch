import { publicSupabase } from "@/integrations/supabase/publicClient";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;
type CollectionRow = Tables<"store_collections">;
type CollectionLinkRow = Tables<"store_collection_products">;
type BrandRow = Tables<"cms_brands">;

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
  | "tags"
  | "base_price"
  | "compare_at_price"
  | "currency"
  | "track_inventory"
  | "allow_backorder"
  | "stock_quantity"
  | "best_seller"
  | "sort_order"
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
  "id" | "handle" | "title" | "description" | "image_url"
>;
type StorefrontCollectionLinkRow = Pick<
  CollectionLinkRow,
  "collection_id" | "product_id" | "sort_order"
>;
type StorefrontBrandRow = Pick<BrandRow, "id" | "name">;

const STOREFRONT_PRODUCT_SELECT =
  "id,title,description,description_html,handle,brand_id,product_type,created_at,tags,base_price,compare_at_price,currency,track_inventory,allow_backorder,stock_quantity,best_seller,sort_order" as const;
const STOREFRONT_VARIANT_SELECT =
  "id,product_id,title,price,compare_at_price,is_active,track_inventory,allow_backorder,stock_quantity,sku,barcode,image_url,options,sort_order" as const;
const STOREFRONT_IMAGE_SELECT =
  "product_id,url,alt_text,is_primary,sort_order" as const;
const STOREFRONT_COLLECTION_SELECT =
  "id,handle,title,description,image_url" as const;
const STOREFRONT_COLLECTION_LINK_SELECT =
  "collection_id,product_id,sort_order" as const;
const STOREFRONT_BRAND_SELECT = "id,name" as const;

type NativeProduct = {
  product: ShopifyProduct;
  row: StorefrontProductRow;
};

type NativeSnapshot = {
  products: NativeProduct[];
  collections: StorefrontStorefrontCollectionRow[];
  links: StorefrontCollectionLinkRow[];
  brands: StorefrontStorefrontBrandRow[];
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
  row: StorefrontProductRow,
  variants: StorefrontVariantRow[],
  images: StorefrontImageRow[],
  collections: StorefrontStorefrontCollectionRow[],
  brand?: StorefrontBrandRow,
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
        publicSupabase.from("store_collection_products")
      .select(STOREFRONT_COLLECTION_LINK_SELECT).order("sort_order", { ascending: true }),
        publicSupabase
          .from("cms_brands")
      .select(STOREFRONT_BRAND_SELECT)
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
        .filter((collection): collection is StorefrontCollectionRow => Boolean(collection));
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

  const [variantResult, imageResult, linkResult, brandResult] = await Promise.all([
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
      ? publicSupabase.from("cms_brands")
      .select(STOREFRONT_BRAND_SELECT).eq("id", row.brand_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const variants = assertResult(variantResult, "product variants");
  const images = assertResult(imageResult, "product images");
  const links = assertResult(linkResult, "product collection links");
  if (brandResult.error) {
    throw new Error(`Supabase product brand failed: ${brandResult.error.message}`);
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
      (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return buildProduct(
    row,
    variants,
    images,
    collections,
    (brandResult.data as StorefrontBrandRow | null) ?? undefined,
  );
}

export async function fetchCollections(first = 100): Promise<ShopifyCollection[]> {
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

function mapCollection(row: StorefrontCollectionRow): ShopifyCollection {
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    image: row.image_url ? { url: row.image_url, altText: row.title } : null,
  };
}

async function fetchSmallCollectionByHandle(
  handle: string,
  pageSize: number,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
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
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
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
    .filter((product): product is ShopifyProduct => Boolean(product))
    .slice(0, Math.max(0, pageSize));

  return { collection: mapCollection(row), products };
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
