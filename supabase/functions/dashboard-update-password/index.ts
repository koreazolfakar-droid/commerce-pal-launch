import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 8_000;
const SENSITIVE_REAUTH_WINDOW_MS = 5 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 14;
const MAX_PASSWORD_LENGTH = 256;

const allowedOrigins = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "admin",
  "admin123",
  "administrator",
  "letmein",
  "welcome",
  "welcome123",
  "iloveyou",
  "00000000",
  "11111111",
  "abc123",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin")?.trim() ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://spacecallapp.store",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function bearerToken(req: Request) {
  const authorization = req.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function normalizePolicyValue(value: string) {
  return value.normalize("NFKC").toLowerCase().trim();
}

function compactPolicyValue(value: string) {
  return normalizePolicyValue(value).replace(/[\s._@+\-]+/g, "");
}

function getPasswordPolicyViolation(password: string, email: string) {
  const normalized = normalizePolicyValue(password);
  const compact = compactPolicyValue(password);

  if (COMMON_PASSWORDS.has(normalized) || COMMON_PASSWORDS.has(compact)) {
    return "common_password";
  }

  if (/^(.)\1{7,}$/u.test(normalized)) {
    return "repeated_character";
  }

  if (/^(.{1,6})\1{2,}$/u.test(normalized)) {
    return "repeated_pattern";
  }

  if (compact.includes("spacecall")) {
    return "brand_related";
  }

  const emailLocalPart = compactPolicyValue(email.split("@")[0] ?? "");
  if (emailLocalPart.length >= 4 && compact.includes(emailLocalPart)) {
    return "identity_related";
  }

  return null;
}

function hasFreshTotpAmr(claims: Record<string, unknown>, now: number) {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  return amr.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Record<string, unknown>;
    if (item.method !== "totp") return false;

    const timestampMs =
      typeof item.timestamp === "number"
        ? item.timestamp * 1000
        : typeof item.timestamp === "string"
          ? Number(item.timestamp) * 1000
          : Number.NaN;

    return (
      Number.isFinite(timestampMs) &&
      now - timestampMs >= 0 &&
      now - timestampMs <= SENSITIVE_REAUTH_WINDOW_MS
    );
  });
}

function toUpperHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

async function sha1Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  return toUpperHex(await crypto.subtle.digest("SHA-1", encoded));
}

async function isPasswordCompromised(password: string) {
  const digest = await sha1Hex(password);
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
        "Add-Padding": "true",
        "User-Agent": "SpaceCall-Dashboard-Password-Security/1.0",
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`hibp_status_${response.status}`);
    }

    const body = await response.text();
    for (const line of body.split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator <= 0) continue;
      if (line.slice(0, separator).trim().toUpperCase() !== suffix) continue;

      const count = Number.parseInt(line.slice(separator + 1).trim(), 10);
      return Number.isFinite(count) && count > 0;
    }

    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  const origin = req.headers.get("origin")?.trim() ?? "";
  if (origin && !allowedOrigins.has(origin)) {
    return json(req, { error: "origin_not_allowed" }, 403);
  }

  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json(req, { error: "server_not_configured" }, 503);

  const token = bearerToken(req);
  if (!token) return json(req, { error: "authentication_required" }, 401);

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 4096) {
    return json(req, { error: "request_too_large" }, 413);
  }

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return json(req, { error: "invalid_password_length" }, 400);
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user?.id) {
    return json(req, { error: "authentication_required" }, 401);
  }

  const claims = decodeJwtPayload(token);
  if (!claims || claims.sub !== user.id || claims.aal !== "aal2") {
    return json(req, { error: "aal2_required" }, 403);
  }

  const now = Date.now();
  if (!hasFreshTotpAmr(claims, now)) {
    return json(req, { error: "fresh_totp_required" }, 403);
  }

  const { data: roleRows, error: roleError } = await admin
    .from("user_roles")
    .select("role,mfa_required,mfa_enrolled_at")
    .eq("user_id", user.id);

  if (roleError) return json(req, { error: "authorization_unavailable" }, 503);

  const hasEnforcedStaffRole = (roleRows ?? []).some(
    (row) =>
      (row.role === "admin" || row.role === "editor") &&
      row.mfa_required === true &&
      Boolean(row.mfa_enrolled_at),
  );
  if (!hasEnforcedStaffRole) {
    return json(req, { error: "dashboard_access_required" }, 403);
  }

  const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
  const requestUserAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);
  const audit = async (
    eventType: string,
    metadata: Record<string, unknown>,
  ) => {
    const { error } = await admin.from("dashboard_security_events").insert({
      user_id: user.id,
      session_id: sessionId,
      event_type: eventType,
      user_agent: requestUserAgent || null,
      metadata,
    });
    if (error) {
      console.warn("[dashboard-security] password security audit log failed", error.message);
    }
  };

  const policyViolation = getPasswordPolicyViolation(password, user.email ?? "");
  if (policyViolation) {
    await audit("password_change_rejected", {
      source: "dashboard-update-password",
      reason: policyViolation,
      local_policy_checked: true,
    });
    return json(req, { error: "password_policy_rejected" }, 422);
  }

  let compromised: boolean;
  try {
    compromised = await isPasswordCompromised(password);
  } catch {
    // Fail closed. A password must never be changed when breach screening
    // could not be completed.
    await audit("password_change_screening_failed", {
      source: "dashboard-update-password",
      hibp_server_checked: false,
    });
    return json(req, { error: "breach_screening_unavailable" }, 503);
  }

  if (compromised) {
    await audit("password_change_rejected", {
      source: "dashboard-update-password",
      reason: "known_breach",
      local_policy_checked: true,
      hibp_server_checked: true,
    });
    return json(req, { error: "compromised_password" }, 422);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    return json(req, { error: "password_update_failed" }, 500);
  }

  await audit("password_changed", {
    source: "dashboard-update-password",
    local_policy_checked: true,
    hibp_server_checked: true,
  });

  return json(req, { ok: true });
});
