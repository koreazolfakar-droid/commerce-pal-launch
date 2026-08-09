import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "dj6qeq-j9.myshopify.com";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = "79c817c6ce2ee3bae9a8bbd151ee5de1";

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    vendor?: string;
    productType?: string;
    availableForSale?: boolean;
    tags?: string[];
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    compareAtPriceRange?: { minVariantPrice: { amount: string; currencyCode: string } };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: { amount: string; currencyCode: string };
          compareAtPrice?: { amount: string; currencyCode: string } | null;
          availableForSale: boolean;
          selectedOptions: Array<{ name: string; value: string }>;
        };
      }>;
    };
    options: Array<{ name: string; values: string[] }>;
  };
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
  tags
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } }
  images(first: 5) { edges { node { url altText } } }
  variants(first: 10) {
    edges {
      node {
        id
        title
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        availableForSale
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
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
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

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? { node } : null;
}

export async function fetchCollections(first = 50): Promise<ShopifyCollection[]> {
  const data = await storefrontApiRequest(COLLECTIONS_QUERY, { first });
  return (
    data?.data?.collections?.edges?.map((edge: { node: ShopifyCollection }) => edge.node) ?? []
  );
}

export async function fetchCollectionByHandle(
  handle: string,
  first = 40,
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
    fetchProducts(8, trimmed),
    fetchCollections(50),
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
