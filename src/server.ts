import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RateBucket = { count: number; resetAt: number };

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_REQUEST_BYTES = 128 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MUTATIONS = 12;
const MAX_RATE_BUCKETS = 5_000;
const mutationRateBuckets = new Map<string, RateBucket>();

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function syncRuntimeEnv(env: unknown) {
  if (!env || typeof env !== "object") return;
  const runtime = env as Record<string, unknown>;
  for (const key of [
    "SHOPIFY_STOREFRONT_TOKEN",
    "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_MODEL",
  ]) {
    const value = runtime[key];
    if (typeof value === "string" && value && !process.env[key]) process.env[key] = value;
  }
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function securityError(status: number, message: string, extraHeaders?: HeadersInit) {
  return withSecurityHeaders(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        ...extraHeaders,
      },
    }),
  );
}

function requestContentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  if (!/^\d+$/.test(raw.trim())) return Number.NaN;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : Number.NaN;
}

function isTrustedMutationOrigin(request: Request) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true;
  const requestOrigin = new URL(request.url).origin;
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== requestOrigin) return false;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function clientAddress(request: Request) {
  // Only trust Cloudflare's canonical client-IP header. Generic forwarding headers
  // are attacker-controlled when a deployment is reachable without a trusted proxy.
  const cloudflareAddress = request.headers.get("cf-connecting-ip");
  if (!cloudflareAddress) return null;
  const address = cloudflareAddress.trim();
  if (!address || address.length > 64 || /[\r\n,]/.test(address)) return null;
  return address;
}

function consumeMutationRateLimit(request: Request) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return { allowed: true, retryAfter: 0 };
  const address = clientAddress(request);
  if (!address) return { allowed: true, retryAfter: 0 };
  const now = Date.now();
  const existing = mutationRateBuckets.get(address);
  if (!existing || existing.resetAt <= now) {
    mutationRateBuckets.set(address, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else if (existing.count >= RATE_LIMIT_MAX_MUTATIONS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  } else {
    existing.count += 1;
  }
  if (mutationRateBuckets.size > MAX_RATE_BUCKETS) {
    for (const [bucketKey, bucket] of mutationRateBuckets) {
      if (bucket.resetAt <= now || mutationRateBuckets.size > MAX_RATE_BUCKETS) mutationRateBuckets.delete(bucketKey);
      if (mutationRateBuckets.size <= MAX_RATE_BUCKETS) break;
    }
  }
  return { allowed: true, retryAfter: 0 };
}

export function guardIncomingRequest(request: Request): Response | null {
  const length = requestContentLength(request);
  if (Number.isNaN(length)) return securityError(400, "Invalid Content-Length header");
  if (length !== null && length > MAX_REQUEST_BYTES) return securityError(413, "Request body is too large");
  if (!isTrustedMutationOrigin(request)) return securityError(403, "Cross-site mutation blocked");
  const rate = consumeMutationRateLimit(request);
  if (!rate.allowed) return securityError(429, "Too many requests", { "retry-after": String(rate.retryAfter) });
  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const blocked = guardIncomingRequest(request);
    if (blocked) return blocked;
    syncRuntimeEnv(env);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withDocumentCache(request, withSecurityHeaders(await normalizeCatastrophicSsrResponse(response)));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        }),
      );
    }
  },
};

function withDocumentCache(request: Request, response: Response): Response {
  if (
    request.method === "GET" &&
    response.ok &&
    !response.headers.has("set-cookie") &&
    response.headers.get("content-type")?.toLowerCase().includes("text/html")
  ) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
}

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  if (headers.get("content-type")?.toLowerCase().includes("text/html")) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "form-action 'self' https://*.myshopify.com https://checkout.shopify.com",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://cdn.shopify.com https://*.shopifycdn.com",
        "media-src 'self' https://cdn.shopify.com https://*.shopifycdn.com",
        "connect-src 'self' https://*.myshopify.com https://cdn.shopify.com",
        "frame-src 'self' https://*.myshopify.com https://checkout.shopify.com",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
