import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const WINDOW_MS = 10 * 60 * 1000;
const PAIR_SOFT_FAILURES = 5;
const PAIR_HARD_FAILURES = 10;
const IP_SOFT_FAILURES = 25;
const IP_HARD_FAILURES = 50;
const SOFT_BLOCK_MS = 15 * 60 * 1000;
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

type Bucket = {
  failure_count: number;
  window_started_at: string;
  blocked_until: string | null;
  last_attempt_at: string;
};

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

  const requestedEmail =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const outcome = String(payload.outcome ?? "");
  if (!["check", "failure", "success"].includes(outcome)) {
    return json({ error: "invalid_request" }, 400);
  }
  if (
    outcome !== "success" &&
    (!requestedEmail || requestedEmail.length > 320 || !requestedEmail.includes("@"))
  ) {
    return json({ error: "invalid_request" }, 400);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let email = requestedEmail;
  if (outcome === "success") {
    const authorization = req.headers.get("authorization")?.trim() ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return json({ error: "authentication_required" }, 401);
    }

    const token = authorization.slice(7).trim();
    if (!token) return json({ error: "authentication_required" }, 401);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user?.id || !user.email) {
      return json({ error: "authentication_required" }, 401);
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleError) return json({ error: "throttle_unavailable" }, 503);
    if (roleRow?.role !== "admin" && roleRow?.role !== "editor") {
      return json({ error: "dashboard_access_required" }, 403);
    }

    // Never trust a client-supplied email for a successful login reset.
    // Bind the reset to the email from the validated Supabase user session.
    email = user.email.trim().toLowerCase();
  }

  if (!email || email.length > 320 || !email.includes("@")) {
    return json({ error: "invalid_request" }, 400);
  }

  const ip = clientIp(req);
  const [pairKeyHash, ipKeyHash] = await Promise.all([
    sha256(`pair|${ip}|${email}`),
    sha256(`ip|${ip}`),
  ]);

  async function readBucket(keyHash: string): Promise<Bucket | null> {
    const { data, error } = await supabase
      .from("dashboard_login_throttle")
      .select("failure_count,window_started_at,blocked_until,last_attempt_at")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (error) throw error;
    return data as Bucket | null;
  }

  async function resetExpired(keyHash: string, bucket: Bucket | null, now: number) {
    if (!bucket) return;
    const start = new Date(bucket.window_started_at).getTime();
    if (Number.isFinite(start) && now - start < WINDOW_MS) return;

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

  function retryAfter(bucket: Bucket | null, now: number) {
    const until = bucket?.blocked_until ? new Date(bucket.blocked_until).getTime() : 0;
    return until > now ? Math.max(1, Math.ceil((until - now) / 1000)) : 0;
  }

  async function recordFailure(
    keyHash: string,
    bucket: Bucket | null,
    softFailures: number,
    hardFailures: number,
    now: number,
  ) {
    const start = bucket?.window_started_at ? new Date(bucket.window_started_at).getTime() : 0;
    const expired = !Number.isFinite(start) || !start || now - start >= WINDOW_MS;
    const nextCount = expired ? 1 : (bucket?.failure_count ?? 0) + 1;
    const blockMs =
      nextCount >= hardFailures ? HARD_BLOCK_MS :
      nextCount >= softFailures ? SOFT_BLOCK_MS :
      0;

    const { error } = await supabase
      .from("dashboard_login_throttle")
      .upsert({
        key_hash: keyHash,
        failure_count: nextCount,
        window_started_at: new Date(expired ? now : start).toISOString(),
        blocked_until: blockMs ? new Date(now + blockMs).toISOString() : null,
        last_attempt_at: new Date(now).toISOString(),
      });
    if (error) throw error;

    return {
      retryAfter: blockMs ? Math.ceil(blockMs / 1000) : 0,
      remainingBeforeBlock: Math.max(0, softFailures - nextCount),
    };
  }

  try {
    let [pairBucket, ipBucket] = await Promise.all([
      readBucket(pairKeyHash),
      readBucket(ipKeyHash),
    ]);

    const now = Date.now();

    if (outcome === "check") {
      const pairRetry = retryAfter(pairBucket, now);
      const ipRetry = retryAfter(ipBucket, now);
      const retry = Math.max(pairRetry, ipRetry);
      if (retry > 0) return json({ allowed: false, retryAfter: retry });

      await Promise.all([
        resetExpired(pairKeyHash, pairBucket, now),
        resetExpired(ipKeyHash, ipBucket, now),
      ]);
      return json({ allowed: true, retryAfter: 0 });
    }

    if (outcome === "success") {
      await supabase
        .from("dashboard_login_throttle")
        .delete()
        .eq("key_hash", pairKeyHash);

      // Keep the IP-wide bucket so password-spraying attempts across multiple
      // accounts still accumulate. Opportunistically prune stale rows only
      // after successful authentication to keep request overhead low.
      await supabase
        .from("dashboard_login_throttle")
        .delete()
        .lt("last_attempt_at", new Date(now - 48 * 60 * 60 * 1000).toISOString());

      return json({ allowed: true, retryAfter: 0 });
    }

    const [pairResult, ipResult] = await Promise.all([
      recordFailure(pairKeyHash, pairBucket, PAIR_SOFT_FAILURES, PAIR_HARD_FAILURES, now),
      recordFailure(ipKeyHash, ipBucket, IP_SOFT_FAILURES, IP_HARD_FAILURES, now),
    ]);

    const retry = Math.max(pairResult.retryAfter, ipResult.retryAfter);
    return json({
      allowed: retry === 0,
      retryAfter: retry,
      remainingBeforeBlock: Math.min(
        pairResult.remainingBeforeBlock,
        ipResult.remainingBeforeBlock,
      ),
    });
  } catch {
    return json({ error: "throttle_unavailable" }, 503);
  }
});