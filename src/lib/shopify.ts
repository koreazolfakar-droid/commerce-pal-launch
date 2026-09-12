import { SHOWCASE_COLLECTIONS_QUERY, SHOP_POLICIES_QUERY } from "@/lib/storefrontDocuments";
import {
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  PRODUCTS_QUERY,
  SHOP_QUERY,
} from "@/lib/shopifyDocuments";
import { STORE_CONFIG } from "@/lib/storeConfig";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SHOPIFY_API_VERSION = STORE_CONFIG.shopifyApiVersion;
export const SHOPIFY_STORE_PERMANENT_DOMAIN = STORE_CONFIG.shopifyDomain;
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

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

/**
 * Fields that require Storefront access scopes this public token does NOT have.
 * Anything listed here is stripped from queries before they are sent, so adding
 * a field to a fragment can never take the storefront down with ACCESS_DENIED.
 */
export const RESTRICTED_STOREFRONT_FIELDS = [
  "quantityAvailable",
  "currentlyNotInStock",
  "requiresShipping",
  "inventoryPolicy",
  "quantityPriceBreaks",
  "sellingPlanAllocations",
  "storeAvailability",
  "unitPrice",
  "unitPriceMeasurement",
  "publishedAt",
  "trackingParameters",
] as const;

export { PRODUCTS_QUERY as STOREFRONT_QUERY } from "@/lib/shopifyDocuments";

/** Fields discovered at runtime to be denied by the current token's scopes. */
const deniedFields = new Set<string>();

function fieldsToStrip() {
  return [...RESTRICTED_STOREFRONT_FIELDS, ...deniedFields];
}

/**
 * Removes fields the token can't read from a GraphQL document. Keeps the query
 * valid by dropping the whole selection line (including any inline sub-selection).
 */
export function sanitizeQuery(query: string, fields = fieldsToStrip()) {
  if (fields.length === 0) return query;
  return query
    .split("\n")
    .filter((line) => {
      const name = line.trim().split(/[\s({]/)[0] ?? "";
      return !fields.includes(name);
    })
    .join("\n");
}

/** Field names Shopify reported as access-denied, parsed from its error messages. */
function extractDeniedFields(errors: Array<{ message: string }>) {
  const found: string[] = [];
  for (const error of errors) {
    const match = /Access denied for (\w+) field/i.exec(error.message ?? "");
    if (match?.[1]) found.push(match[1]);
  }
  return found;
}

const STOREFRONT_QUERY_NAMES = new Set([
  SHOWCASE_COLLECTIONS_QUERY,
  SHOP_POLICIES_QUERY,
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  SHOP_QUERY,
  CART_QUERY,
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
]);

const storefrontApiRequestFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      query: z
        .string()
        .refine((value) => STOREFRONT_QUERY_NAMES.has(value), "Unsupported Shopify operation"),
      variables: z.record(z.unknown()).default({}),
    }),
  )
  .handler(async ({ data }) => {
    const token =
      process.env["SHOPIFY_STOREFRONT_TOKEN"] ?? process.env["SHOPIFY_STOREFRONT_ACCESS_TOKEN"];
    if (!token) throw new Error("Shopify Storefront token is not configured on the server");

    const postStorefront = async (query: string, variables: Record<string, unknown>) => {
      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token,
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
      });
      if (response.status === 402) {
        throw new Error("Shopify billing is required");
      }
      if (!response.ok) throw new Error(`Shopify request failed (${response.status})`);
      return response.json();
    };

    const sanitized = sanitizeQuery(data.query);
    const result = await postStorefront(sanitized, data.variables);
    const errors: Array<{ message: string }> = result.errors ?? [];
    if (errors.length) {
      const denied = extractDeniedFields(errors).filter((field) => !deniedFields.has(field));
      if (denied.length) {
        denied.forEach((field) => deniedFields.add(field));
        const retry = await postStorefront(sanitizeQuery(data.query), data.variables);
        if (retry?.data) return retry;
      }
      if (!result.data)
        throw new Error(`Error calling Shopify: ${errors.map((e) => e.message).join(", ")}`);
      console.warn(`Shopify partial response: ${errors.map((e) => e.message).join(", ")}`);
    }
    return result;
  });

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  return storefrontApiRequestFn({ data: { query, variables } });
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

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? { node } : null;
}

/**
 * Shopify's own "You may also like" recommendations for a product. Returns an
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
