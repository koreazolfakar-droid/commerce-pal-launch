import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "dj6qeq-j9.myshopify.com";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = "79c817c6ce2ee3bae9a8bbd151ee5de1";

export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
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
        quantityAvailable?: number | null;
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

const PRODUCT_FIELDS = `
  id
  title
  description
  handle
  vendor
  productType
  availableForSale
  createdAt
  tags
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } }
  images(first: 8) { edges { node { url altText } } }
  collections(first: 15) { edges { node { handle title } } }
  variants(first: 50) {
    edges {
      node {
        id
        title
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        availableForSale
        quantityAvailable
        image { url altText }
        selectedOptions { name value }
      }
    }
  }
  options { name values }
`;

const COLLECTION_FIELDS = `
  id
  handle
  title
  description
  image { url altText }
`;

export const STOREFRONT_QUERY = `
  query GetProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo { hasNextPage endCursor }
      edges { node { ${PRODUCT_FIELDS} } }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

export const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!) {
    collections(first: $first) {
      edges { node { ${COLLECTION_FIELDS} } }
    }
  }
`;

export const COLLECTION_BY_HANDLE_QUERY = `
  query GetCollection($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      ${COLLECTION_FIELDS}
      products(first: $first) {
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }
  }
`;

export const SHOP_QUERY = `
  query Shop {
    shop { name description }
  }
`;

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description:
        "Shopify API access requires an active Shopify billing plan. Visit https://admin.shopify.com to upgrade.",
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(
      `Error calling Shopify: ${data.errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }

  return data;
}

export async function fetchProducts(first = 30, query?: string): Promise<ShopifyProduct[]> {
  const data = await storefrontApiRequest(STOREFRONT_QUERY, { first, query });
  return data?.data?.products?.edges ?? [];
}

/**
 * Fetches the full catalog by following Shopify's cursor pagination.
 * The whole catalog powers the dynamic taxonomy, facets and sections, so it is
 * cached once per session by TanStack Query instead of refetched per page.
 */
export async function fetchAllProducts(pageSize = 250, maxPages = 20): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let after: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: pageSize, after });
    const connection = data?.data?.products;
    if (!connection) break;
    all.push(...(connection.edges ?? []));
    if (!connection.pageInfo?.hasNextPage) break;
    after = connection.pageInfo.endCursor ?? null;
    if (!after) break;
  }

  return all;
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? { node } : null;
}

export async function fetchCollections(first = 100): Promise<ShopifyCollection[]> {
  const data = await storefrontApiRequest(COLLECTIONS_QUERY, { first });
  return (
    data?.data?.collections?.edges?.map((edge: { node: ShopifyCollection }) => edge.node) ?? []
  );
}

export async function fetchCollectionByHandle(
  handle: string,
  first = 100,
): Promise<{ collection: ShopifyCollection; products: ShopifyProduct[] } | null> {
  const data = await storefrontApiRequest(COLLECTION_BY_HANDLE_QUERY, { handle, first });
  const node = data?.data?.collection;
  if (!node) return null;
  const { products, ...collection } = node;
  return { collection: collection as ShopifyCollection, products: products?.edges ?? [] };
}

export async function searchStorefront(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return { products: [] as ShopifyProduct[], collections: [] as ShopifyCollection[] };
  const [products, collections] = await Promise.all([
    fetchProducts(20, trimmed),
    fetchCollections(100),
  ]);
  const lowered = trimmed.toLowerCase();
  return {
    products,
    collections: collections.filter((collection) =>
      collection.title.toLowerCase().includes(lowered),
    ),
  };
}

export function formatPrice(amount: string | number, currencyCode: string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/** Discount percentage from a price / compare-at pair, or null when there is no saving. */
export function discountPercent(price?: string | null, compareAt?: string | null) {
  const current = price ? parseFloat(price) : NaN;
  const was = compareAt ? parseFloat(compareAt) : NaN;
  if (!isFinite(current) || !isFinite(was) || was <= current || was <= 0) return null;
  return Math.round(((was - current) / was) * 100);
}

/** Short "256GB • Titanium" style summary from a variant's selected options. */
export function variantSummary(options?: Array<{ name: string; value: string }>) {
  if (!options?.length) return "";
  return options
    .filter((option) => option.value && option.value !== "Default Title")
    .map((option) => option.value)
    .join(" • ");
}

/** Lowest variant price of a product, used for price facets and sorting. */
export function productPrice(product: ShopifyProduct) {
  const node = product.node;
  const variantPrices = node.variants.edges
    .map((edge) => parseFloat(edge.node.price.amount))
    .filter((value) => isFinite(value));
  if (variantPrices.length > 0) return Math.min(...variantPrices);
  return parseFloat(node.priceRange.minVariantPrice.amount) || 0;
}

export function productCurrency(product: ShopifyProduct) {
  return (
    product.node.variants.edges[0]?.node.price.currencyCode ??
    product.node.priceRange.minVariantPrice.currencyCode ??
    "USD"
  );
}

export function productCompareAt(product: ShopifyProduct) {
  const node = product.node;
  const variant = node.variants.edges[0]?.node;
  return variant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount ?? null;
}

export function productInStock(product: ShopifyProduct) {
  const node = product.node;
  if (typeof node.availableForSale === "boolean") return node.availableForSale;
  return node.variants.edges.some((edge) => edge.node.availableForSale);
}

export function productCollectionHandles(product: ShopifyProduct) {
  return (product.node.collections?.edges ?? []).map((edge) => edge.node.handle);
}
