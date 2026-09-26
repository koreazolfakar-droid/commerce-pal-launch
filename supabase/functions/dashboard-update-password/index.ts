import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 8_000;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 256;

const allowedOrigins = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
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
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
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

  let compromised: boolean;
  try {
    compromised = await isPasswordCompromised(password);
  } catch {
    // Fail closed. A password must never be changed when breach screening
    // could not be completed.
    return json(req, { error: "breach_screening_unavailable" }, 503);
  }

  if (compromised) {
    return json(req, { error: "compromised_password" }, 422);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    return json(req, { error: "password_update_failed" }, 500);
  }

  const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);
  const { error: auditError } = await admin.from("dashboard_security_events").insert({
    user_id: user.id,
    session_id: sessionId,
    event_type: "password_changed",
    user_agent: userAgent || null,
    metadata: {
      source: "dashboard-update-password",
      hibp_server_checked: true,
    },
  });

  if (auditError) {
    console.warn("[dashboard-security] server password audit log failed", auditError.message);
  }

  return json(req, { ok: true });
});
