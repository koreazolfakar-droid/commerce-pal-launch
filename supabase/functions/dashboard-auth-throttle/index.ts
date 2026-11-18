import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { readBoundedText, RequestBodyTooLargeError } from "../_shared/requestBody.ts";

// Counter thresholds and durations live in the transactional database RPC,
// not in this Edge Function, to avoid non-atomic read/modify/write races.

const allowedOrigins = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "https://app.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function originAllowed(origin: string) {
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      (
        url.hostname.endsWith(".lovable.app") ||
        url.hostname.endsWith(".lovableproject.com") ||
        url.hostname.endsWith(".lovableproject-dev.com") ||
        url.hostname.endsWith(".gpt-eng.com") ||
        url.hostname.endsWith(".gptengineer.run")
      )
    );
  } catch {
    return false;
  }
}

function cors(req: Request) {
  const origin = req.headers.get("origin")?.trim() ?? "";
  return {
    ...(originAllowed(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
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

type Outcome = "attempt" | "check" | "failure" | "success";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json(req, { error: "server_not_configured" }, 503);

  // This is a public pre-auth endpoint. Reject oversized/streaming payloads
  // before buffering or parsing JSON (Content-Length cannot be trusted).
  let payload: { email?: unknown; outcome?: unknown };
  try {
    const parsed: unknown = JSON.parse(await readBoundedText(req, 1024));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(req, { error: "invalid_request" }, 400);
    }
    payload = parsed as typeof payload;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json(req, { error: "payload_too_large" }, 413);
    }
    return json(req, { error: "invalid_json" }, 400);
  }

  const requestedEmail =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const requestedOutcome = String(payload.outcome ?? "");
  if (!["attempt", "check", "failure", "success"].includes(requestedOutcome)) {
    return json(req, { error: "invalid_request" }, 400);
  }
  const outcome = requestedOutcome as Outcome;

  if (
    outcome !== "success" &&
    (!requestedEmail || requestedEmail.length > 320 || !requestedEmail.includes("@"))
  ) {
    return json(req, { error: "invalid_request" }, 400);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let email = requestedEmail;
  if (outcome === "success") {
    const authorization = req.headers.get("authorization")?.trim() ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return json(req, { error: "authentication_required" }, 401);
    }

    const token = authorization.slice(7).trim();
    if (!token) return json(req, { error: "authentication_required" }, 401);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user?.id || !user.email) {
      return json(req, { error: "authentication_required" }, 401);
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleError) return json(req, { error: "throttle_unavailable" }, 503);
    if (roleRow?.role !== "admin" && roleRow?.role !== "editor") {
      return json(req, { error: "dashboard_access_required" }, 403);
    }

    // Never trust a client-supplied email for a successful login reset.
    // Bind the reset to the email from the validated Supabase user session.
    email = user.email.trim().toLowerCase();
  }

  if (!email || email.length > 320 || !email.includes("@")) {
    return json(req, { error: "invalid_request" }, 400);
  }

  // Compatibility for clients deployed before the attempt-based protocol.
  // Failure reports no longer inspect account existence or mutate account-specific
  // state. The pre-auth "check" request below already consumes the attempt.
  if (outcome === "failure") {
    return json(req, { allowed: true, retryAfter: 0 });
  }

  const ip = clientIp(req);
  const [pairKeyHash, ipKeyHash] = await Promise.all([
    sha256(`pair|${ip}|${email}`),
    sha256(`ip|${ip}`),
  ]);

  try {
    if (outcome === "attempt" || outcome === "check") {
      // One PostgreSQL transaction serializes pair/IP updates under concurrent
      // requests. Missing or invalid RPC responses fail closed at the caller.
      const { data, error } = await supabase.rpc("consume_dashboard_login_attempt", {
        p_pair_key_hash: pairKeyHash,
        p_ip_key_hash: ipKeyHash,
      });
      const decision = data as {
        allowed?: unknown;
        retryAfter?: unknown;
        remainingBeforeBlock?: unknown;
      } | null;
      if (
        error ||
        !decision ||
        typeof decision.allowed !== "boolean" ||
        typeof decision.retryAfter !== "number" ||
        !Number.isSafeInteger(decision.retryAfter) ||
        decision.retryAfter < 0
      ) {
        throw new Error("invalid_atomic_throttle_response");
      }
      return json(req, {
        allowed: decision.allowed,
        retryAfter: decision.retryAfter,
        ...(typeof decision.remainingBeforeBlock === "number" &&
        Number.isSafeInteger(decision.remainingBeforeBlock) &&
        decision.remainingBeforeBlock >= 0
          ? { remainingBeforeBlock: decision.remainingBeforeBlock }
          : {}),
      });
    }

    // A reset is accepted only after validating the user's JWT and checking
    // their actual staff role above. Keep the IP-wide anti-spraying counter.
    const { error: resetError } = await supabase
      .from("dashboard_login_throttle")
      .delete()
      .eq("key_hash", pairKeyHash);
    if (resetError) throw resetError;

    // Prune only after a successful authenticated staff login.
    await supabase
      .from("dashboard_login_throttle")
      .delete()
      .lt("last_attempt_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    return json(req, { allowed: true, retryAfter: 0 });
  } catch {
    return json(req, { error: "throttle_unavailable" }, 503);
  }
});
