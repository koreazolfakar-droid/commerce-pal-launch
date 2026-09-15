import {
  BRAND_VENDORS_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  PRODUCTS_QUERY,
} from "@/lib/shopifyDocuments";
import {
  RESTRICTED_STOREFRONT_FIELDS,
  SHOPIFY_API_VERSION,
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STORE_PERMANENT_DOMAIN,
  sanitizeQuery,
  storefrontApiRequest,
} from "@/lib/shopifyTransport";

export {
  RESTRICTED_STOREFRONT_FIELDS,
  SHOPIFY_API_VERSION,
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STORE_PERMANENT_DOMAIN,
  sanitizeQuery,
  storefrontApiRequest,
};

export { PRODUCTS_QUERY as STOREFRONT_QUERY } from "@/lib/shopifyDocuments";

export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  handle: string;
  vendor?: string;
  productType?: string;
  availableForSale?: boolean;
  createdAt?: string;
  tags?: string[];
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  compareAtPriceRange?: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  collections?: { edges: Array<{ node: { handle: string; title: string } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        compareAtPrice?: { amount: string; currencyCode: string } | null;
        availableForSale: boolean;
        sku?: string | null;
        barcode?: string | null;
        weight?: number | null;
        weightUnit?: string | null;
        image?: { url: string; altText: string | null } | null;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  options: Array<{ name: string; values: string[] }>;
}

export interface ShopifyProduct {
  node: ShopifyProductNode;
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string | null } | null;
}

export async function fetchProducts(
  first = 30,
  query?: string,
  sortKey?: "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE",
  reverse?: boolean,
): Promise<ShopifyProduct[]> {
  const data = await storefrontApiRequest(PRODUCTS_QUERY, {
    first,
    query,
    sortKey,
    reverse,
  });
  return data?.data?.products?.edges ?? [];
}

/** Shopify's native merchandising order; never a fabricated popularity list. */
export async function fetchBestSellingProducts(first = 12): Promise<ShopifyProduct[]> {
  return fetchProducts(first, undefined, "BEST_SELLING");
}

/**
 * Bounded discovery page used for navigation and homepage taxonomy. Product
 * detail, search, collection and recommendation routes have dedicated queries.
 */
export async function fetchCatalogProducts(first = 60): Promise<ShopifyProduct[]> {
  return fetchProducts(Math.min(Math.max(first, 1), 100));
}

/**
 * Fetch every explicit Shopify vendor using a vendor-only payload. This keeps
 * brand discovery complete while the homepage catalogue remains intentionally bounded.
 */
export async function fetchBrandVendors(pageSize = 100): Promise<string[]> {
  const vendors: string[] = [];
  const first = Math.min(Math.max(pageSize, 1), 100);
  let after: string | undefined;

  do {
    const data = await storefrontApiRequest(BRAND_VENDORS_QUERY, { first, after });
    const connection = data?.data?.products;
    for (const edge of connection?.edges ?? []) {
      const vendor = edge?.node?.vendor;
      if (typeof vendor === "string" && vendor.trim()) vendors.push(vendor);
    }
    after = connection?.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : undefined;
  } while (after);

  return vendors;
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? { node } : null;
}

/**
 * Shopify's own "You may also like" recommendations for the product detail page. Returns an
 * empty list (never throws) so the product page degrades gracefully.
 */
export async function fetchProductRecommendations(handle: string): Promise<ShopifyProduct[]> {
  try {
    const data = await storefrontApiRequest(PRODUCT_RECOMMENDATIONS_QUERY, { handle });
    const nodes = data?.data?.productRecommendations;
    if (!Array.isArray(nodes)) return [];
    return nodes.map((node: ShopifyProductNode) => ({ node }));
  } catch {
    return [];
  }
}

export async function fetchCollections(first = 50): Promise<ShopifyCollection[]> {
  const data = await storefrontApiRequest(COLLECTIONS_QUERY, {
    first: Math.min(Math.max(first, 1), 100),
  });
  return (
    data?.data?.collections?.edges?.map((edge: { node: ShopifyCollection }) => edge.node) ?? []
  );
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
  const data = await storefrontApiRequest(COLLECTION_BY_HANDLE_QUERY, {
    handle,
    first: Math.min(Math.max(pageSize, 1), 100),
  });
  const node = data?.data?.collection;
  if (!node) return null;
  const { products, ...collection } = node;
  return {
    collection: collection as ShopifyCollection,
    products: products?.edges ?? [],
  };
}

export async function searchStorefront(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return { products: [] as ShopifyProduct[], collections: [] as ShopifyCollection[] };
  const [products, collections] = await Promise.all([
    fetchProducts(20, trimmed),
    fetchCollections(30),
  ]);
  const lowered = trimmed.toLowerCase();
  return {
    products,
    collections: collections.filter((collection) =>
      collection.title.toLowerCase().includes(lowered),
    ),
  };
}

function quoteSearchValue(value: string) {
  return `"${value.replace(/["\\]/g, " ").trim()}"`;
}

export function fetchProductsByVendor(vendor: string, first = 8) {
  return fetchProducts(Math.min(first, 20), `vendor:${quoteSearchValue(vendor)}`);
}

/** Full brand route payload, paginated only when a customer opens that brand. */
export async function fetchAllProductsByVendor(
  vendor: string,
  pageSize = 100,
): Promise<ShopifyProduct[]> {
  const trimmed = vendor.trim();
  if (!trimmed) return [];

  const products: ShopifyProduct[] = [];
  const first = Math.min(Math.max(pageSize, 1), 100);
  const query = `vendor:${quoteSearchValue(trimmed)}`;
  let after: string | undefined;

  do {
    const data = await storefrontApiRequest(PRODUCTS_QUERY, { first, after, query });
    const connection = data?.data?.products;
    products.push(...(connection?.edges ?? []));
    after = connection?.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : undefined;
  } while (after);

  return products;
}

export function fetchProductsByHandles(handles: string[], first = 20) {
  const unique = [...new Set(handles.map((handle) => handle.trim()).filter(Boolean))].slice(0, 20);
  if (!unique.length) return Promise.resolve([]);
  const query = unique.map((handle) => `handle:${quoteSearchValue(handle)}`).join(" OR ");
  return fetchProducts(Math.min(first, unique.length), query);
}

export {
  formatPrice,
  discountPercent,
  variantSummary,
  productPrimaryVariant,
  productPrice,
  productCurrency,
  productCompareAt,
  productDiscountPercent,
  productInStock,
  productCollectionHandles,
} from "@/lib/productPricing";
