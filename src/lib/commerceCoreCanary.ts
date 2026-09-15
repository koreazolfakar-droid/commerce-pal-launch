import { fetchProductByHandle, type ShopifyProduct, type ShopifyProductNode } from "@/lib/shopify";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PRODUCT_CONTRACT_VERSION = "product-detail-v1";
const DEFAULT_CANARY_PERCENT = 0;
const DEFAULT_TIMEOUT_MS = 1_200;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 3_000;

type ProductReadMode = "off" | "canary";

type CommerceCoreProductResponse = {
  ok: true;
  source: "shopify";
  contractVersion: typeof PRODUCT_CONTRACT_VERSION;
  product: ShopifyProductNode;
};

function productReadMode(): ProductReadMode {
  return process.env["COMMERCE_CORE_PRODUCT_READ_MODE"] === "canary" ? "canary" : "off";
}

function commerceCoreUrl() {
  const raw = process.env["COMMERCE_CORE_URL"]?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function commerceCoreCanaryPercent() {
  return boundedInteger(
    process.env["COMMERCE_CORE_CANARY_PERCENT"],
    DEFAULT_CANARY_PERCENT,
    0,
    100,
  );
}

function commerceCoreTimeoutMs() {
  return boundedInteger(
    process.env["COMMERCE_CORE_TIMEOUT_MS"],
    DEFAULT_TIMEOUT_MS,
    MIN_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
}

/** Stable FNV-1a bucket so the same product handle stays in the same canary cohort. */
export function commerceCoreCanaryBucket(handle: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < handle.length; index += 1) {
    hash ^= handle.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function shouldUseCommerceCoreCanary(handle: string, percent: number) {
  return percent > 0 && commerceCoreCanaryBucket(handle) < Math.min(percent, 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasProductConnection(value: unknown) {
  return isRecord(value) && Array.isArray(value["edges"]);
}

function isCompatibleProductNode(
  value: unknown,
  expectedHandle: string,
): value is ShopifyProductNode {
  if (!isRecord(value)) return false;
  return (
    value["handle"] === expectedHandle &&
    typeof value["id"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["description"] === "string" &&
    hasProductConnection(value["images"]) &&
    hasProductConnection(value["variants"]) &&
    Array.isArray(value["options"]) &&
    isRecord(value["priceRange"])
  );
}

function parseCommerceCoreResponse(
  value: unknown,
  expectedHandle: string,
): CommerceCoreProductResponse | null {
  if (!isRecord(value)) return null;
  if (value["ok"] !== true) return null;
  if (value["source"] !== "shopify") return null;
  if (value["contractVersion"] !== PRODUCT_CONTRACT_VERSION) return null;
  if (!isCompatibleProductNode(value["product"], expectedHandle)) return null;

  return value as CommerceCoreProductResponse;
}

async function fetchCommerceCoreProduct(baseUrl: string, handle: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), commerceCoreTimeoutMs());

  try {
    const response = await fetch(`${baseUrl}/products/${encodeURIComponent(handle)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-store",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Commerce Core request failed (${response.status})`);

    const contract = response.headers.get("x-space-call-contract");
    if (contract !== PRODUCT_CONTRACT_VERSION) {
      throw new Error("Commerce Core contract header mismatch");
    }

    const payload: unknown = await response.json();
    const parsed = parseCommerceCoreResponse(payload, handle);
    if (!parsed) throw new Error("Commerce Core returned an incompatible product payload");

    return { node: parsed.product } satisfies ShopifyProduct;
  } finally {
    clearTimeout(timeout);
  }
}

const fetchCanaryProductServer = createServerFn({ method: "GET" })
  .validator(
    z.object({
      handle: z.string().trim().min(1).max(128),
    }),
  )
  .handler(async ({ data }): Promise<ShopifyProduct | null> => {
    const fallback = () => fetchProductByHandle(data.handle);

    if (productReadMode() !== "canary") return fallback();

    const baseUrl = commerceCoreUrl();
    if (!baseUrl) return fallback();

    const percent = commerceCoreCanaryPercent();
    if (!shouldUseCommerceCoreCanary(data.handle, percent)) return fallback();

    try {
      return await fetchCommerceCoreProduct(baseUrl, data.handle);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown Commerce Core error";
      console.warn(`[commerce-core] product canary fallback for ${data.handle}: ${reason}`);
      return fallback();
    }
  });

/**
 * Step 4A gateway. It is intentionally not wired into the storefront route yet.
 * The gateway defaults to the legacy Shopify path unless server-only canary settings enable it.
 */
export async function fetchProductByHandleCanary(handle: string) {
  return fetchCanaryProductServer({ data: { handle } });
}
