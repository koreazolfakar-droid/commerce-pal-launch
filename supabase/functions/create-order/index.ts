import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const ALLOWED_ORIGINS = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const MAX_BODY_BYTES = 64 * 1024;
const RATE_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_PER_IP = 30;
const RATE_LIMIT_PER_PHONE = 5;

function responseHeaders(req: Request) {
  const origin = req.headers.get("origin")?.trim() || "";
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed.default ?? Object.values(parsed)[0];
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      // Fall back to the standard service-role secret below.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}

function json(req: Request, status: number, body: Record<string, unknown>, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(req), ...(extra ?? {}) },
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isMoney(value: unknown, max: number) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-7
  );
}

function validatePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "invalid_payload";
  const payload = value as Record<string, unknown>;

  if (
    typeof payload.idempotency_key !== "string" ||
    payload.idempotency_key.trim().length < 16 ||
    payload.idempotency_key.trim().length > 128
  ) {
    return "idempotency_key_required";
  }

  const customer = payload.customer;
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return "invalid_customer";
  }
  const customerRecord = customer as Record<string, unknown>;

  if (
    typeof customerRecord.name !== "string" ||
    customerRecord.name.trim().length < 2 ||
    customerRecord.name.trim().length > 120
  ) {
    return "customer_name_required";
  }

  if (
    typeof customerRecord.phone !== "string" ||
    customerRecord.phone.replace(/\D/g, "").length < 7 ||
    customerRecord.phone.length > 32
  ) {
    return "customer_phone_required";
  }

  if (
    typeof customerRecord.city !== "string" ||
    customerRecord.city.trim().length < 2 ||
    customerRecord.city.trim().length > 120
  ) {
    return "customer_city_required";
  }

  if (
    typeof customerRecord.address !== "string" ||
    customerRecord.address.trim().length < 2 ||
    customerRecord.address.trim().length > 500
  ) {
    return "customer_address_required";
  }

  if (!isMoney(payload.expected_subtotal, 1_000_000_000)) {
    return "invalid_expected_subtotal";
  }
  if (!isMoney(payload.expected_delivery_fee, 10_000)) {
    return "invalid_expected_delivery_fee";
  }

  if (
    payload.notes !== undefined &&
    (typeof payload.notes !== "string" || payload.notes.length > 1000)
  ) {
    return "invalid_notes";
  }

  if (
    payload.reference !== undefined &&
    (typeof payload.reference !== "string" || payload.reference.length > 120)
  ) {
    return "invalid_reference";
  }

  const items = payload.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) return "invalid_items";

  const variantIds = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "invalid_item";
    const record = item as Record<string, unknown>;
    if (!isUuid(record.product_id) || !isUuid(record.variant_id)) {
      return "invalid_item_identifier";
    }
    if (
      !Number.isInteger(record.quantity) ||
      Number(record.quantity) < 1 ||
      Number(record.quantity) > 99
    ) {
      return "invalid_quantity";
    }
    if (variantIds.has(record.variant_id)) return "duplicate_variant";
    variantIds.add(record.variant_id);
  }

  const location = payload.delivery_location;
  if (location !== undefined && location !== null) {
    if (!location || typeof location !== "object" || Array.isArray(location)) {
      return "invalid_delivery_location";
    }
    const point = location as Record<string, unknown>;
    if (
      typeof point.latitude !== "number" ||
      !Number.isFinite(point.latitude) ||
      point.latitude < -90 ||
      point.latitude > 90 ||
      typeof point.longitude !== "number" ||
      !Number.isFinite(point.longitude) ||
      point.longitude < -180 ||
      point.longitude > 180 ||
      (point.accuracy !== undefined &&
        (typeof point.accuracy !== "number" ||
          !Number.isFinite(point.accuracy) ||
          point.accuracy < 0 ||
          point.accuracy > 100_000))
    ) {
      return "invalid_delivery_location";
    }
  }

  const payment = payload.payment_method;
  if (payment !== undefined && payment !== "cash" && payment !== "whish") {
    return "invalid_payment_method";
  }

  return null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicError(message: string | undefined) {
  const known = [
    "invalid_payload",
    "invalid_items",
    "invalid_item_identifier",
    "invalid_quantity",
    "duplicate_variant",
    "idempotency_key_required",
    "idempotency_key_conflict",
    "invalid_delivery_location",
    "customer_name_required",
    "customer_phone_required",
    "customer_city_required",
    "customer_address_required",
    "invalid_expected_subtotal",
    "invalid_expected_delivery_fee",
    "invalid_expected_pricing",
    "invalid_notes",
    "invalid_reference",
    "invalid_payment_method",
    "product_or_variant_unavailable",
    "insufficient_stock",
    "mixed_currency_order",
    "pricing_changed",
    "invalid_delivery_fee_config",
  ];
  return known.find((code) => message?.includes(code)) ?? "order_failed";
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

  let body: unknown;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json(req, 413, { error: "payload_too_large" });
    }
    body = JSON.parse(text);
  } catch {
    return json(req, 400, { error: "invalid_json" });
  }

  const validationError = validatePayload(body);
  if (validationError) return json(req, 400, { error: validationError });

  const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const secret = serviceKey();
  if (!url || !secret) return json(req, 500, { error: "server_not_configured" });

  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const forwarded =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const customerPhone = (
    ((body as Record<string, unknown>).customer as Record<string, unknown>).phone as string
  )
    .replace(/\D/g, "")
    .slice(0, 32);

  // Use two independent buckets. A wider IP bucket avoids punishing many real
  // shoppers behind the same carrier NAT, while the tighter hashed-phone bucket
  // still limits repeated checkout abuse without storing the phone number.
  const [ipFingerprint, phoneFingerprint] = await Promise.all([
    sha256(forwarded.slice(0, 128)),
    sha256(customerPhone),
  ]);

  const enforceRateLimit = async (key: string, limit: number) => {
    const { data: rateRows, error: rateError } = await db.rpc("consume_edge_rate_limit", {
      _key: key,
      _window_seconds: RATE_WINDOW_SECONDS,
      _limit: limit,
    });

    if (rateError) {
      console.error("create-order rate limiter failed", rateError.message);
      return json(req, 503, { error: "temporarily_unavailable" });
    }

    const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
    if (rate?.allowed) return null;

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
  };

  const ipRateLimit = await enforceRateLimit(
    `create-order:ip:${ipFingerprint}`,
    RATE_LIMIT_PER_IP,
  );
  if (ipRateLimit) return ipRateLimit;

  const phoneRateLimit = await enforceRateLimit(
    `create-order:phone:${phoneFingerprint}`,
    RATE_LIMIT_PER_PHONE,
  );
  if (phoneRateLimit) return phoneRateLimit;

  const { data, error } = await db.rpc("create_store_order_internal", { payload: body });
  if (error) {
    const code = publicError(error.message);
    console.warn("create-order rejected", code);
    const status =
      code === "insufficient_stock" ||
      code === "product_or_variant_unavailable" ||
      code === "idempotency_key_conflict" ||
      code === "pricing_changed"
        ? 409
        : code === "invalid_delivery_fee_config"
          ? 503
          : 400;
    return json(req, status, { error: code });
  }

  return json(req, 201, { ok: true, order: data });
});
