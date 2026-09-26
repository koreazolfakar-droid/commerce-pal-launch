import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { isClientDisconnectError } from "./lib/client-disconnect";
import { renderErrorPage } from "./lib/error-page";
import { buildContentSecurityPolicy } from "./lib/contentSecurityPolicy";
import { consumeSharedMutationRateLimit } from "./security/mutation-rate-limit.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_REQUEST_BYTES = 128 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MUTATIONS = 24;

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
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]) {
    const value = runtime[key];
    if (typeof value === "string" && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  request: Request,
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const capturedError = consumeLastCapturedError();
  // Browsers routinely cancel an in-flight document request during navigation,
  // refresh, or HMR. h3 converts that disconnect into its generic 500 payload;
  // returning it as an application failure makes the preview report a blank
  // screen even though the replacement navigation succeeds.
  if (request.signal.aborted || isClientDisconnectError(capturedError)) {
    return new Response(null, { status: 499, statusText: "Client Closed Request" });
  }

  console.error(capturedError ?? new Error(`h3 swallowed SSR error: ${body}`));
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
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
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

  // Requests without browser origin metadata are still allowed for SSR/platform
  // compatibility. Browser cross-site mutations are rejected above.
  return true;
}

async function consumeMutationRateLimit(request: Request, env: unknown) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return { allowed: true, retryAfter: 0 };
  }

  return consumeSharedMutationRateLimit(request, env, {
    limit: RATE_LIMIT_MAX_MUTATIONS,
    windowSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  });
}

export async function guardIncomingRequest(request: Request, env: unknown): Promise<Response | null> {
  const length = requestContentLength(request);
  if (length !== null && length > MAX_REQUEST_BYTES) {
    return securityError(413, "Request body is too large");
  }

  if (!isTrustedMutationOrigin(request)) {
    return securityError(403, "Cross-site mutation blocked");
  }

  const rate = await consumeMutationRateLimit(request, env);
  if (rate.unavailable) {
    return securityError(503, "Request protection is temporarily unavailable", {
      "retry-after": String(rate.retryAfter),
    });
  }
  if (!rate.allowed) {
    return securityError(429, "Too many requests", { "retry-after": String(rate.retryAfter) });
  }

  return null;
}

// Production recovery marker: this file intentionally preserves the last known-good
// request flow while forcing deployment systems that watch src/** to rebuild.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const blocked = await guardIncomingRequest(request, env);
    if (blocked) return blocked;

    // Cloudflare/Lovable runtime bindings are passed through `env`; TanStack server
    // functions in this app read server-only secrets from process.env. Mirror only
    // the known server-side Supabase bindings needed by SSR.
    syncRuntimeEnv(env);

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withDashboardNoStore(
        request,
        withDocumentCache(
          request,
          withStaticAssetCache(
            request,
            withSecurityHeaders(await normalizeCatastrophicSsrResponse(request, response)),
          ),
        ),
      );
    } catch (error) {
      if (request.signal.aborted || isClientDisconnectError(error)) {
        return new Response(null, { status: 499, statusText: "Client Closed Request" });
      }
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

/**
 * HTML is dynamic storefront state and must never survive a deploy at the CDN.
 * Hashed JS/CSS/images keep their normal platform caching; only documents are
 * forced fresh so /, /shop, /help and product pages cannot expose mixed builds.
 */
function withDashboardNoStore(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/dashboard")) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Surrogate-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function withDocumentCache(request: Request, response: Response): Response {
  if (
    request.method === "GET" &&
    response.ok &&
    !response.headers.has("set-cookie") &&
    response.headers.get("content-type")?.toLowerCase().includes("text/html")
  ) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Surrogate-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  return response;
}

/**
 * Static first-party artwork was previously served without an explicit browser
 * lifetime. Hashed Vite output can be immutable; stable public artwork uses a
 * bounded browser lifetime so merchant asset replacements still propagate.
 */
function withStaticAssetCache(request: Request, response: Response): Response {
  if (request.method !== "GET" || !response.ok || response.headers.has("set-cookie")) {
    return response;
  }

  const pathname = new URL(request.url).pathname;
  let cacheControl: string | null = null;

  if (pathname.startsWith("/assets/")) {
    cacheControl = "public, max-age=31536000, immutable";
  } else if (
    pathname.startsWith("/brand-logos/") ||
    pathname.startsWith("/category-icons/") ||
    pathname === "/logo.svg" ||
    pathname === "/logo.png"
  ) {
    cacheControl = "public, max-age=604800";
  }

  if (!cacheControl) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(), display-capture=()");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  if (
    headers.get("content-type")?.toLowerCase().includes("text/html") &&
    !headers.has("Content-Security-Policy")
  ) {
    // Normal SSR documents receive a request-scoped nonce CSP from the root route.
    // This strict fallback is for catastrophic/error HTML that contains no scripts.
    headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
