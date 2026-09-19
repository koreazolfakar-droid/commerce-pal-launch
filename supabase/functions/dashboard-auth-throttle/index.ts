import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const WINDOW_MS = 10 * 60 * 1000;
const FIRST_BLOCK_FAILURES = 5;
const HARD_BLOCK_FAILURES = 10;
const FIRST_BLOCK_MS = 15 * 60 * 1000;
const HARD_BLOCK_MS = 60 * 60 * 1000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("true-client-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  ).slice(0, 160);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json({ error: "server_not_configured" }, 503);

  let payload: { email?: unknown; outcome?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const outcome = payload.outcome;
  if (!email || email.length > 320 || !email.includes("@")) {
    return json({ error: "invalid_request" }, 400);
  }
  if (!["check", "failure"].includes(String(outcome))) {
    return json({ error: "invalid_request" }, 400);
  }

  const keyHash = await sha256(`${clientIp(req)}|${email}`);
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: readError } = await supabase
    .from("dashboard_login_throttle")
    .select("failure_count,window_started_at,blocked_until,last_attempt_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (readError) return json({ error: "throttle_unavailable" }, 503);

  const now = Date.now();
  const blockedUntil = row?.blocked_until ? new Date(row.blocked_until).getTime() : 0;
  const windowStarted = row?.window_started_at ? new Date(row.window_started_at).getTime() : 0;
  const windowExpired = !windowStarted || now - windowStarted >= WINDOW_MS;

  if (outcome === "check") {
    if (blockedUntil > now) {
      return json({
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
      });
    }

    if (row && windowExpired) {
      await supabase
        .from("dashboard_login_throttle")
        .update({
          failure_count: 0,
          window_started_at: new Date(now).toISOString(),
          blocked_until: null,
          last_attempt_at: new Date(now).toISOString(),
        })
        .eq("key_hash", keyHash);
    }

    return json({ allowed: true, retryAfter: 0 });
  }

  const nextCount = windowExpired ? 1 : (row?.failure_count ?? 0) + 1;
  let blockMs = 0;
  if (nextCount >= HARD_BLOCK_FAILURES) blockMs = HARD_BLOCK_MS;
  else if (nextCount >= FIRST_BLOCK_FAILURES) blockMs = FIRST_BLOCK_MS;

  const nextBlockedUntil = blockMs ? new Date(now + blockMs).toISOString() : null;
  const { error: writeError } = await supabase
    .from("dashboard_login_throttle")
    .upsert({
      key_hash: keyHash,
      failure_count: nextCount,
      window_started_at: new Date(windowExpired ? now : windowStarted).toISOString(),
      blocked_until: nextBlockedUntil,
      last_attempt_at: new Date(now).toISOString(),
    });

  if (writeError) return json({ error: "throttle_unavailable" }, 503);

  if (blockMs) {
    return json({
      allowed: false,
      retryAfter: Math.ceil(blockMs / 1000),
    });
  }

  return json({
    allowed: true,
    retryAfter: 0,
    remainingBeforeBlock: Math.max(0, FIRST_BLOCK_FAILURES - nextCount),
  });
});