import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const ORIGINS = new Set(["https://spacecallapp.store", "https://www.spacecallapp.store"]);
const MAX_BODY = 128 * 1024;

function headers(req: Request) {
  const origin = req.headers.get("origin")?.trim() || "";
  return {
    ...(ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function out(req: Request, data: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers(req), ...extra } });
}

function publicKeys() {
  const values: string[] = [];
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    try {
      for (const value of Object.values(JSON.parse(raw))) {
        if (typeof value === "string" && value) values.push(value);
      }
    } catch {}
  }
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (anon) values.push(anon);
  return [...new Set(values)];
}

function validPublicKey(req: Request) {
  const key = req.headers.get("apikey")?.trim() || "";
  const auth = req.headers.get("authorization")?.trim() || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return Boolean(key && bearer && key === bearer && publicKeys().includes(key));
}

function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed.default ?? Object.values(parsed)[0];
      if (typeof value === "string" && value) return value;
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function clientAddress(req: Request) {
  for (const name of ["cf-connecting-ip", "true-client-ip", "x-real-ip", "fly-client-ip"]) {
    const value = req.headers.get(name)?.trim();
    if (value) return value.slice(0, 128);
  }
  return (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown").slice(0, 128);
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function rateLimit(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const secret = serviceKey();
  if (!url || !secret) throw new Error("rate_limit_backend_unavailable");
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = await hash(clientAddress(req));
  const checks = [
    ["nvidia:global:minute", 60, 60],
    ["nvidia:global:day", 86400, 500],
    [`nvidia:ip:minute:${ip}`, 60, 20],
    [`nvidia:ip:day:${ip}`, 86400, 300],
  ] as const;

  for (const [key, seconds, limit] of checks) {
    const { data, error } = await db.rpc("consume_edge_rate_limit", {
      _key: key,
      _window_seconds: seconds,
      _limit: limit,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.allowed === false) {
      const reset = row.reset_at ? Date.parse(row.reset_at) : NaN;
      return Number.isFinite(reset) ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
    }
  }
  return 0;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")?.trim() || "";
  if (origin && !ORIGINS.has(origin)) return out(req, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return out(req, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!validPublicKey(req)) return out(req, { ok: false, code: "INVALID_SUPABASE_KEY" }, 401);

  const length = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_BODY) return out(req, { ok: false, code: "BODY_TOO_LARGE" }, 413);
  const raw = await req.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY) return out(req, { ok: false, code: "BODY_TOO_LARGE" }, 413);

  let body: any;
  try { body = JSON.parse(raw); } catch { return out(req, { ok: false, code: "INVALID_JSON" }, 400); }
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m: any) => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: m.content.trim().slice(0, 12000) }))
    .filter((m: any) => m.content);
  if (!messages.length || messages.reduce((n: number, m: any) => n + m.content.length, 0) > 18000) {
    return out(req, { ok: false, code: "MESSAGES_INVALID" }, 400);
  }

  try {
    const retryAfter = await rateLimit(req);
    if (retryAfter) return out(req, { ok: false, code: "AI_RATE_LIMITED" }, 429, { "Retry-After": String(retryAfter) });
  } catch (error) {
    console.error("AI rate limit check failed", error instanceof Error ? error.message : String(error));
    return out(req, { ok: false, code: "RATE_LIMIT_UNAVAILABLE" }, 503);
  }

  const key = Deno.env.get("NVIDIA_API_KEY");
  if (!key) return out(req, { ok: false, code: "NVIDIA_API_KEY_MISSING" }, 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("NVIDIA_MODEL") || "openai/gpt-oss-20b",
        messages,
        stream: false,
        temperature: 0.2,
        max_tokens: 1800,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: any = null;
    try { payload = JSON.parse(text); } catch {}
    if (!response.ok) {
      console.error("NVIDIA upstream error", response.status);
      return out(req, { ok: false, code: "NVIDIA_UPSTREAM_ERROR", upstream_status: response.status }, 502);
    }
    if (!payload || !Array.isArray(payload.choices)) return out(req, { ok: false, code: "INVALID_NVIDIA_RESPONSE" }, 502);
    const answer = payload.choices?.[0]?.message?.content ?? "";
    return out(req, { ...payload, ok: true, answer, content: answer, reply: answer, provider: "nvidia" });
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === "AbortError";
    return out(req, { ok: false, code: timeout ? "NVIDIA_TIMEOUT" : "NVIDIA_REQUEST_FAILED" }, timeout ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
});
