import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const ALLOWED_ORIGINS = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const RATE_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_PER_USER = 120;
const MAX_LIMIT = 100;
const MAX_BODY_BYTES = 8 * 1024;

function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed.default ?? Object.values(parsed)[0];
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      // Fall back to the standard service-role secret.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}

function responseHeaders(req: Request) {
  const origin = req.headers.get("origin")?.trim() || "";
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function json(req: Request, status: number, body: Record<string, unknown>, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(req), ...(extra ?? {}) },
  });
}

function bearerToken(req: Request) {
  const authorization = req.headers.get("authorization")?.trim() || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function normalizedPhone(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function orderIdentityMatches(
  row: Record<string, unknown>,
  user: { id: string; email?: string | null; phone?: string | null },
) {
  if (typeof row.customer_user_id === "string" && row.customer_user_id) {
    return row.customer_user_id === user.id;
  }

  const userEmail = user.email?.trim().toLowerCase() || "";
  const orderEmail =
    typeof row.customer_email === "string" ? row.customer_email.trim().toLowerCase() : "";
  if (userEmail && orderEmail === userEmail) return true;

  const userPhone = normalizedPhone(user.phone);
  const orderPhone = normalizedPhone(row.customer_phone);
  return Boolean(userPhone && orderPhone === userPhone);
}

function publicOrder(row: Record<string, unknown>) {
  return {
    order_id: row.id,
    order_number: row.order_number,
    status: row.status,
    payment_status: row.payment_status,
    payment_method: row.payment_method,
    currency: row.currency,
    subtotal: row.subtotal,
    shipping_total: row.shipping_total,
    discount_total: row.discount_total,
    total: row.total,
    delivery_address: row.delivery_address,
    city: row.city,
    delivery_location: row.delivery_location,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")?.trim() || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(req, 403, { error: "origin_not_allowed" });
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders(req) });
  }
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });

  const contentType = req.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    return json(req, 415, { error: "content_type_required" });
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json(req, 413, { error: "payload_too_large" });
  }

  const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const secret = serviceKey();
  if (!url || !secret) return json(req, 500, { error: "server_not_configured" });

  const token = bearerToken(req);
  if (!token) return json(req, 401, { error: "authentication_required" });

  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await db.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json(req, 401, { error: "invalid_session" });

  const { data: rateRows, error: rateError } = await db.rpc("consume_edge_rate_limit", {
    _key: "customer-orders:user:" + user.id,
    _window_seconds: RATE_WINDOW_SECONDS,
    _limit: RATE_LIMIT_PER_USER,
  });
  if (rateError) {
    console.error("customer-orders rate limiter failed", rateError.message);
    return json(req, 503, { error: "temporarily_unavailable" });
  }

  const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
  if (!rate?.allowed) {
    const resetAt = typeof rate?.reset_at === "string" ? Date.parse(rate.reset_at) : NaN;
    const retryAfter = Number.isFinite(resetAt)
      ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
      : RATE_WINDOW_SECONDS;
    return json(
      req,
      429,
      { error: "rate_limited", retry_after: retryAfter },
      { "Retry-After": String(retryAfter) },
    );
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json(req, 413, { error: "payload_too_large" });
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(req, 400, { error: "invalid_payload" });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(req, 400, { error: "invalid_json" });
  }

  const action = body.action === "items" ? "items" : "list";

  if (action === "items") {
    if (!isUuid(body.order_id)) return json(req, 400, { error: "invalid_order_id" });

    const { data: order, error: orderError } = await db
      .from("store_orders")
      .select("id,customer_user_id,customer_email,customer_phone")
      .eq("id", body.order_id)
      .maybeSingle();

    if (orderError) {
      console.error("customer-orders ownership lookup failed", orderError.message);
      return json(req, 503, { error: "temporarily_unavailable" });
    }
    if (!order || !orderIdentityMatches(order as Record<string, unknown>, user)) {
      return json(req, 404, { error: "order_not_found" });
    }

    const { data: items, error: itemsError } = await db
      .from("store_order_items")
      .select(
        "id,product_id,variant_id,title,variant_title,sku,unit_price,quantity,line_total,options",
      )
      .eq("order_id", body.order_id)
      .order("id", { ascending: true });

    if (itemsError) {
      console.error("customer-orders items lookup failed", itemsError.message);
      return json(req, 503, { error: "temporarily_unavailable" });
    }

    return json(req, 200, {
      ok: true,
      items: (items ?? []).map((item) => ({
        item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        variant_title: item.variant_title,
        sku: item.sku,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
        options: item.options,
      })),
    });
  }

  const requestedLimit = Number(body.limit);
  const limit = Math.max(
    1,
    Math.min(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 30, MAX_LIMIT),
  );

  const columns =
    "id,order_number,status,payment_status,payment_method,currency,subtotal,shipping_total,discount_total,total,delivery_address,city,delivery_location,created_at,completed_at,customer_user_id,customer_email,customer_phone";

  const results = new Map<string, Record<string, unknown>>();
  const collect = (rows: unknown[] | null) => {
    for (const row of rows ?? []) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const record = row as Record<string, unknown>;
      if (typeof record.id !== "string") continue;
      if (orderIdentityMatches(record, user)) results.set(record.id, record);
    }
  };

  const byUser = await db
    .from("store_orders")
    .select(columns)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (byUser.error) {
    console.error("customer-orders user lookup failed", byUser.error.message);
    return json(req, 503, { error: "temporarily_unavailable" });
  }
  collect(byUser.data as unknown[] | null);

  if (user.email) {
    const byEmail = await db
      .from("store_orders")
      .select(columns)
      .ilike("customer_email", user.email.trim())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (byEmail.error) {
      console.error("customer-orders email lookup failed", byEmail.error.message);
      return json(req, 503, { error: "temporarily_unavailable" });
    }
    collect(byEmail.data as unknown[] | null);
  }

  if (user.phone) {
    const byPhone = await db
      .from("store_orders")
      .select(columns)
      .eq("customer_phone", user.phone.trim())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (byPhone.error) {
      console.error("customer-orders phone lookup failed", byPhone.error.message);
      return json(req, 503, { error: "temporarily_unavailable" });
    }
    collect(byPhone.data as unknown[] | null);
  }

  const orders = [...results.values()]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, limit)
    .map(publicOrder);

  return json(req, 200, { ok: true, orders });
});
