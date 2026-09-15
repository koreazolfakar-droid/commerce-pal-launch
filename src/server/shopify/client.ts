import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SHOWCASE_COLLECTIONS_QUERY, SHOP_POLICIES_QUERY } from "@/lib/storefrontDocuments";
import {
  BRAND_VENDORS_QUERY,
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

export const SHOPIFY_API_VERSION = STORE_CONFIG.shopifyApiVersion;
export const SHOPIFY_STORE_PERMANENT_DOMAIN = STORE_CONFIG.shopifyDomain;
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

/**
 * Fields that require Storefront access scopes this public token does NOT have.
 * Anything listed here is stripped from queries before they are sent, so adding
 * a field to a fragment cannot take the storefront down with ACCESS_DENIED.
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

type StorefrontJsonValue = Awaited<ReturnType<Response["json"]>>;
type StorefrontCacheEntry = { expiresAt: number; value: StorefrontJsonValue };

const STOREFRONT_CACHE_TTL_MS = 60_000;
const STOREFRONT_CACHE_MAX_ENTRIES = 100;
const PERSISTENT_STOREFRONT_CACHE_NAME = "space-call-storefront-v2";
const PERSISTENT_STOREFRONT_CACHE_TIMESTAMP_HEADER = "x-space-call-cached-at";

const deniedFields = new Set<string>();
const storefrontResponseCache = new Map<string, StorefrontCacheEntry>();
const storefrontPendingRequests = new Map<string, Promise<StorefrontJsonValue>>();

const PUBLIC_STOREFRONT_QUERY_NAMES = new Set([
  SHOWCASE_COLLECTIONS_QUERY,
  SHOP_POLICIES_QUERY,
  PRODUCTS_QUERY,
  BRAND_VENDORS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  SHOP_QUERY,
]);

const STOREFRONT_QUERY_NAMES = new Set([
  ...PUBLIC_STOREFRONT_QUERY_NAMES,
  CART_QUERY,
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
]);

function storefrontCacheKey(query: string, variables: Record<string, unknown>) {
  return `${query}\n${JSON.stringify(variables)}`;
}

function pruneStorefrontCache(now: number) {
  for (const [key, entry] of storefrontResponseCache) {
    if (entry.expiresAt <= now || storefrontResponseCache.size > STOREFRONT_CACHE_MAX_ENTRIES) {
      storefrontResponseCache.delete(key);
    }
    if (storefrontResponseCache.size <= STOREFRONT_CACHE_MAX_ENTRIES) break;
  }
}

function persistentStorefrontRequest(key: string) {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  const digest = `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}-${key.length}`;
  return new Request(`https://storefront-cache.space-call.invalid/${digest}`);
}

async function readPersistentStorefrontCache(
  key: string,
): Promise<StorefrontJsonValue | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open(PERSISTENT_STOREFRONT_CACHE_NAME);
    const request = persistentStorefrontRequest(key);
    const response = await cache.match(request);
    if (!response) return undefined;

    const cachedAt = Number(response.headers.get(PERSISTENT_STOREFRONT_CACHE_TIMESTAMP_HEADER));
    const expired = !Number.isFinite(cachedAt) || Date.now() - cachedAt >= STOREFRONT_CACHE_TTL_MS;
    if (expired) {
      await cache.delete(request);
      return undefined;
    }

    return response.json();
  } catch {
    return undefined;
  }
}

async function writePersistentStorefrontCache(key: string, value: StorefrontJsonValue) {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(PERSISTENT_STOREFRONT_CACHE_NAME);
    await cache.put(
      persistentStorefrontRequest(key),
      new Response(JSON.stringify(value), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
          [PERSISTENT_STOREFRONT_CACHE_TIMESTAMP_HEADER]: String(Date.now()),
        },
      }),
    );
  } catch {
    // The in-memory cache remains available on runtimes without CacheStorage.
  }
}

function fieldsToStrip() {
  return [...RESTRICTED_STOREFRONT_FIELDS, ...deniedFields];
}

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

function extractDeniedFields(errors: Array<{ message: string }>) {
  const found: string[] = [];
  for (const error of errors) {
    const match = /Access denied for (\w+) field/i.exec(error.message ?? "");
    if (match?.[1]) found.push(match[1]);
  }
  return found;
}

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
      if (response.status === 402) throw new Error("Shopify billing is required");
      if (!response.ok) throw new Error(`Shopify request failed (${response.status})`);
      return response.json();
    };

    const cacheable = PUBLIC_STOREFRONT_QUERY_NAMES.has(data.query);
    const key = storefrontCacheKey(data.query, data.variables);
    const now = Date.now();

    if (cacheable) {
      const cached = storefrontResponseCache.get(key);
      if (cached && cached.expiresAt > now) return cached.value;
      const pending = storefrontPendingRequests.get(key);
      if (pending) return pending;
      pruneStorefrontCache(now);
    }

    const request = (async () => {
      if (cacheable) {
        const persistent = await readPersistentStorefrontCache(key);
        if (persistent !== undefined) return persistent;
      }

      const result = await postStorefront(sanitizeQuery(data.query), data.variables);
      const errors: Array<{ message: string }> = result.errors ?? [];
      if (errors.length) {
        const denied = extractDeniedFields(errors).filter((field) => !deniedFields.has(field));
        if (denied.length) {
          denied.forEach((field) => deniedFields.add(field));
          const retry = await postStorefront(sanitizeQuery(data.query), data.variables);
          if (retry?.data) return retry;
        }
        if (!result.data) {
          throw new Error(`Error calling Shopify: ${errors.map((error) => error.message).join(", ")}`);
        }
        console.warn(`Shopify partial response: ${errors.map((error) => error.message).join(", ")}`);
      }
      return result;
    })();

    if (!cacheable) return request;

    storefrontPendingRequests.set(key, request);
    try {
      const result = await request;
      storefrontResponseCache.set(key, {
        value: result,
        expiresAt: Date.now() + STOREFRONT_CACHE_TTL_MS,
      });
      await writePersistentStorefrontCache(key, result);
      return result;
    } finally {
      storefrontPendingRequests.delete(key);
    }
  });

export async function storefrontApiRequest(
  query: string,
  variables: Record<string, unknown> = {},
) {
  return storefrontApiRequestFn({ data: { query, variables } });
}
