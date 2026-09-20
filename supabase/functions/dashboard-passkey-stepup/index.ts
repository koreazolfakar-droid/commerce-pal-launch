import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const PASSWORD_STAGE_WINDOW_MS = 5 * 60 * 1000;
const PASSKEY_ASSURANCE_MS = 8 * 60 * 60 * 1000;

const allowedOrigins = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://spacecallapp.store",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
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
    const parsed = JSON.parse(atob(padded));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function uuidLike(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function latestPasskeyUse(data: unknown): string | null {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const passkeys = Array.isArray(data)
    ? data
    : Array.isArray(root.passkeys)
      ? root.passkeys
      : Array.isArray(root.data)
        ? root.data
        : [];

  let latest = 0;
  for (const item of passkeys) {
    if (!item || typeof item !== "object") continue;
    const value = (item as Record<string, unknown>).last_used_at;
    if (typeof value !== "string") continue;
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp);
  }

  return latest > 0 ? new Date(latest).toISOString() : null;
}

function hasRecentPasswordAmr(claims: Record<string, unknown>, now: number) {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  return amr.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Record<string, unknown>;
    if (item.method !== "password") return false;
    const timestamp =
      typeof item.timestamp === "number"
        ? item.timestamp * 1000
        : typeof item.timestamp === "string"
          ? Number(item.timestamp) * 1000
          : Number.NaN;
    return Number.isFinite(timestamp) && now - timestamp >= 0 && now - timestamp <= PASSWORD_STAGE_WINDOW_MS;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json(req, { error: "server_not_configured" }, 503);

  const mainToken = bearerToken(req);
  if (!mainToken) return json(req, { error: "authentication_required" }, 401);

  const admin = createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      experimental: { passkey: true },
    },
  });

  const {
    data: { user: mainUser },
    error: mainUserError,
  } = await admin.auth.getUser(mainToken);
  if (mainUserError || !mainUser?.id) {
    return json(req, { error: "authentication_required" }, 401);
  }

  const claims = decodeJwtPayload(mainToken);
  const sessionId =
    claims && typeof claims.session_id === "string" && uuidLike(claims.session_id)
      ? claims.session_id
      : "";
  if (!claims || claims.sub !== mainUser.id || !sessionId) {
    return json(req, { error: "invalid_session" }, 401);
  }

  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", mainUser.id)
    .maybeSingle();
  if (roleError) return json(req, { error: "authorization_unavailable" }, 503);
  if (roleRow?.role !== "admin" && roleRow?.role !== "editor") {
    return json(req, { error: "dashboard_access_required" }, 403);
  }

  let body: {
    action?: unknown;
    ticketId?: unknown;
    passkeyAccessToken?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const now = Date.now();

  if (action === "status") {
    const { data: assurance, error: assuranceError } = await admin
      .from("dashboard_passkey_session_assurance")
      .select("expires_at")
      .eq("session_id", sessionId)
      .eq("user_id", mainUser.id)
      .gt("expires_at", new Date(now).toISOString())
      .maybeSingle();

    if (assuranceError) return json(req, { error: "stepup_unavailable" }, 503);
    return json(req, { ok: true, ready: Boolean(assurance?.expires_at) });
  }

  if (action === "begin") {
    if (!hasRecentPasswordAmr(claims, now)) {
      return json(req, { error: "recent_password_required" }, 403);
    }

    const { data: passkeys, error: passkeyError } =
      await admin.auth.admin.passkey.listPasskeys({ userId: mainUser.id });
    if (passkeyError) return json(req, { error: "passkey_lookup_failed" }, 503);

    const root =
      passkeys && typeof passkeys === "object"
        ? (passkeys as unknown as Record<string, unknown>)
        : {};
    const count = Array.isArray(passkeys)
      ? passkeys.length
      : Array.isArray(root.passkeys)
        ? root.passkeys.length
        : Array.isArray(root.data)
          ? root.data.length
          : 0;
    if (count < 1) return json(req, { error: "no_passkey_registered" }, 409);

    const baselineLastUsedAt = latestPasskeyUse(passkeys);
    const expiresAt = new Date(now + PASSWORD_STAGE_WINDOW_MS).toISOString();

    await admin
      .from("dashboard_passkey_stepup_tickets")
      .delete()
      .eq("user_id", mainUser.id)
      .lt("expires_at", new Date(now).toISOString());

    const { data: ticket, error: ticketError } = await admin
      .from("dashboard_passkey_stepup_tickets")
      .insert({
        user_id: mainUser.id,
        password_session_id: sessionId,
        baseline_last_used_at: baselineLastUsedAt,
        expires_at: expiresAt,
      })
      .select("id,expires_at")
      .single();

    if (ticketError || !ticket?.id) {
      return json(req, { error: "stepup_unavailable" }, 503);
    }

    return json(req, {
      ok: true,
      ticketId: ticket.id,
      expiresAt: ticket.expires_at,
    });
  }

  if (action === "complete") {
    if (!uuidLike(body.ticketId)) {
      return json(req, { error: "invalid_ticket" }, 400);
    }

    const passkeyAccessToken =
      typeof body.passkeyAccessToken === "string"
        ? body.passkeyAccessToken.trim()
        : "";
    if (!passkeyAccessToken || passkeyAccessToken.length > 8192) {
      return json(req, { error: "invalid_passkey_proof" }, 400);
    }

    const { data: ticket, error: ticketError } = await admin
      .from("dashboard_passkey_stepup_tickets")
      .select("id,user_id,password_session_id,baseline_last_used_at,created_at,expires_at,consumed_at")
      .eq("id", body.ticketId)
      .maybeSingle();

    if (ticketError) return json(req, { error: "stepup_unavailable" }, 503);
    if (
      !ticket ||
      ticket.user_id !== mainUser.id ||
      ticket.password_session_id !== sessionId ||
      ticket.consumed_at
    ) {
      return json(req, { error: "invalid_ticket" }, 403);
    }

    const ticketExpiry = new Date(ticket.expires_at).getTime();
    if (!Number.isFinite(ticketExpiry) || ticketExpiry <= now) {
      return json(req, { error: "ticket_expired" }, 403);
    }

    const {
      data: { user: passkeyUser },
      error: passkeyUserError,
    } = await admin.auth.getUser(passkeyAccessToken);
    if (passkeyUserError || !passkeyUser?.id || passkeyUser.id !== mainUser.id) {
      return json(req, { error: "passkey_identity_mismatch" }, 403);
    }

    const { data: passkeys, error: passkeyError } =
      await admin.auth.admin.passkey.listPasskeys({ userId: mainUser.id });
    if (passkeyError) return json(req, { error: "passkey_lookup_failed" }, 503);

    const latestUsedAt = latestPasskeyUse(passkeys);
    const latestUsedMs = latestUsedAt ? new Date(latestUsedAt).getTime() : 0;
    const baselineMs = ticket.baseline_last_used_at
      ? new Date(ticket.baseline_last_used_at).getTime()
      : 0;
    const ticketCreatedMs = new Date(ticket.created_at).getTime();

    if (
      !latestUsedMs ||
      latestUsedMs <= Math.max(baselineMs || 0, ticketCreatedMs - 1500) ||
      now - latestUsedMs > PASSWORD_STAGE_WINDOW_MS
    ) {
      return json(req, { error: "fresh_passkey_required" }, 403);
    }

    const consumedAt = new Date(now).toISOString();
    const { data: consumed, error: consumeError } = await admin
      .from("dashboard_passkey_stepup_tickets")
      .update({ consumed_at: consumedAt })
      .eq("id", ticket.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();

    if (consumeError) return json(req, { error: "stepup_unavailable" }, 503);
    if (!consumed?.id) return json(req, { error: "ticket_already_used" }, 409);

    const assuranceExpiresAt = new Date(now + PASSKEY_ASSURANCE_MS).toISOString();
    const { error: assuranceError } = await admin
      .from("dashboard_passkey_session_assurance")
      .upsert(
        {
          session_id: sessionId,
          user_id: mainUser.id,
          verified_at: consumedAt,
          expires_at: assuranceExpiresAt,
          passkey_last_used_at: latestUsedAt,
        },
        { onConflict: "session_id" },
      );

    if (assuranceError) return json(req, { error: "stepup_unavailable" }, 503);

    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);
    await admin.from("dashboard_security_events").insert({
      user_id: mainUser.id,
      session_id: sessionId,
      event_type: "login_success",
      user_agent: userAgent || null,
      metadata: {
        second_factor: "passkey",
        assurance: "server_verified_webauthn_stepup",
      },
    });

    return json(req, {
      ok: true,
      method: "passkey",
      expiresAt: assuranceExpiresAt,
    });
  }

  return json(req, { error: "invalid_action" }, 400);
});
