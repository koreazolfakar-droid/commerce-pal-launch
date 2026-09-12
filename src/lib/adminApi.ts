import { STORE_CONFIG } from "@/lib/storeConfig";

type AdminGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function configuredDashboardOrigin() {
  return normalizeOrigin(process.env["ADMIN_DASHBOARD_ORIGIN"] ?? "");
}

function corsHeaders(request: Request) {
  const headers = new Headers({
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    vary: "Origin",
  });

  const allowedOrigin = configuredDashboardOrigin();
  const requestOrigin = normalizeOrigin(request.headers.get("origin") ?? "");
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
  }

  return headers;
}

function constantTimeEqual(a: string, b: string) {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < max; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export function adminJson(request: Request, payload: unknown, status = 200) {
  const headers = corsHeaders(request);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

export function adminPreflight(request: Request) {
  const allowedOrigin = configuredDashboardOrigin();
  const requestOrigin = normalizeOrigin(request.headers.get("origin") ?? "");
  if (!allowedOrigin || requestOrigin !== allowedOrigin) {
    return adminJson(request, { error: "Dashboard origin is not allowed" }, 403);
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function authorizeAdminRequest(request: Request): Response | null {
  const allowedOrigin = configuredDashboardOrigin();
  const requestOrigin = normalizeOrigin(request.headers.get("origin") ?? "");

  if (requestOrigin && (!allowedOrigin || requestOrigin !== allowedOrigin)) {
    return adminJson(request, { error: "Dashboard origin is not allowed" }, 403);
  }

  const expectedKey = process.env["ADMIN_DASHBOARD_API_KEY"]?.trim() ?? "";
  if (!expectedKey) {
    return adminJson(request, { error: "Admin dashboard API key is not configured" }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const providedKey = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!providedKey || !constantTimeEqual(providedKey, expectedKey)) {
    return adminJson(request, { error: "Unauthorized" }, 401);
  }

  return null;
}

export function adminConfiguration() {
  return {
    dashboardOriginConfigured: Boolean(configuredDashboardOrigin()),
    apiKeyConfigured: Boolean(process.env["ADMIN_DASHBOARD_API_KEY"]?.trim()),
    shopifyAdminConfigured: Boolean(process.env["SHOPIFY_ADMIN_API_TOKEN"]?.trim()),
    shopifyDomain: STORE_CONFIG.shopifyDomain,
    storeName: STORE_CONFIG.name,
  };
}

export async function shopifyAdminRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env["SHOPIFY_ADMIN_API_TOKEN"]?.trim();
  if (!token) throw new Error("Shopify Admin API token is not configured");

  const apiVersion =
    process.env["SHOPIFY_ADMIN_API_VERSION"]?.trim() || STORE_CONFIG.shopifyApiVersion;
  const url = `https://${STORE_CONFIG.shopifyDomain}/admin/api/${apiVersion}/graphql.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as AdminGraphqlResponse<T>;
  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed (${response.status})`);
  }
  if (payload.errors?.length) {
    throw new Error(
      payload.errors.map((error) => error.message || "Unknown Shopify error").join(", "),
    );
  }
  if (!payload.data) throw new Error("Shopify Admin API returned no data");
  return payload.data;
}
