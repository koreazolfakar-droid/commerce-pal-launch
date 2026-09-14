import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const ORIGINS = new Set(["https://spacecallapp.store", "https://www.spacecallapp.store"]);
const MAX_BODY = 128 * 1024;
const PROVIDER_TIMEOUT_MS = 17_000;

type ProviderName = "nvidia" | "openrouter";
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ProviderAttempt = { provider: ProviderName; status: number; code: string };

type ChatPayload = {
  model?: string;
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: unknown;
  [key: string]: unknown;
};

function headers(req: Request) {
  const origin = req.headers.get("origin")?.trim() || "";
  return {
    ...(ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
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

function providerOrder(): ProviderName[] {
  const configured = (Deno.env.get("AI_PROVIDER_ORDER") || "nvidia,openrouter")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName => value === "nvidia" || value === "openrouter");
  return [...new Set(configured.length ? configured : ["nvidia", "openrouter"])] as ProviderName[];
}

function providerConfig(provider: ProviderName) {
  if (provider === "nvidia") {
    return {
      key: Deno.env.get("NVIDIA_API_KEY")?.trim() || "",
      model: Deno.env.get("NVIDIA_MODEL")?.trim() || "openai/gpt-oss-20b",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      headers: {} as Record<string, string>,
    };
  }

  return {
    key: Deno.env.get("OPENROUTER_API_KEY")?.trim() || "",
    model: Deno.env.get("OPENROUTER_MODEL")?.trim() || "openrouter/auto",
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      "HTTP-Referer": "https://spacecallapp.store",
      "X-Title": "Space Call",
    },
  };
}

async function callProvider(
  provider: ProviderName,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
) {
  const config = providerConfig(provider);
  if (!config.key) {
    return {
      ok: false as const,
      attempt: { provider, status: 0, code: "NOT_CONFIGURED" } satisfies ProviderAttempt,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.headers,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: ChatPayload | null = null;
    try {
      payload = text ? (JSON.parse(text) as ChatPayload) : null;
    } catch {}

    if (!response.ok) {
      console.error("AI provider upstream error", { provider, status: response.status });
      return {
        ok: false as const,
        attempt: {
          provider,
          status: response.status,
          code: "UPSTREAM_ERROR",
        } satisfies ProviderAttempt,
      };
    }

    if (!payload || !Array.isArray(payload.choices) || !payload.choices.length) {
      console.error("AI provider invalid response", { provider });
      return {
        ok: false as const,
        attempt: { provider, status: 502, code: "INVALID_RESPONSE" } satisfies ProviderAttempt,
      };
    }

    const answer = payload.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      console.error("AI provider empty response", { provider });
      return {
        ok: false as const,
        attempt: { provider, status: 502, code: "EMPTY_RESPONSE" } satisfies ProviderAttempt,
      };
    }

    return {
      ok: true as const,
      payload,
      provider,
      model: typeof payload.model === "string" && payload.model.trim() ? payload.model : config.model,
    };
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === "AbortError";
    console.error("AI provider request failed", {
      provider,
      code: timeout ? "TIMEOUT" : "REQUEST_FAILED",
    });
    return {
      ok: false as const,
      attempt: {
        provider,
        status: timeout ? 504 : 502,
        code: timeout ? "TIMEOUT" : "REQUEST_FAILED",
      } satisfies ProviderAttempt,
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")?.trim() || "";
  if (origin && !ORIGINS.has(origin)) return out(req, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return out(req, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!validPublicKey(req)) return out(req, { ok: false, code: "INVALID_SUPABASE_KEY" }, 401);

  const length = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_BODY) {
    return out(req, { ok: false, code: "BODY_TOO_LARGE" }, 413);
  }
  const raw = await req.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY) {
    return out(req, { ok: false, code: "BODY_TOO_LARGE" }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return out(req, { ok: false, code: "INVALID_JSON" }, 400);
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (message: any) =>
        message &&
        ["system", "user", "assistant"].includes(message.role) &&
        typeof message.content === "string",
    )
    .slice(-12)
    .map((message: any) => ({
      role: message.role as ChatMessage["role"],
      content: message.content.trim().slice(0, 12000),
    }))
    .filter((message: ChatMessage) => message.content);

  if (!messages.length || messages.reduce((sum, message) => sum + message.content.length, 0) > 18000) {
    return out(req, { ok: false, code: "MESSAGES_INVALID" }, 400);
  }

  const requestedTemperature = typeof body.temperature === "number" ? body.temperature : 0.2;
  const temperature = Math.max(0, Math.min(1, requestedTemperature));
  const requestedMaxTokens = typeof body.max_tokens === "number" ? body.max_tokens : 1800;
  const maxTokens = Math.max(256, Math.min(2400, Math.floor(requestedMaxTokens)));

  try {
    const retryAfter = await rateLimit(req);
    if (retryAfter) {
      return out(req, { ok: false, code: "AI_RATE_LIMITED" }, 429, {
        "Retry-After": String(retryAfter),
      });
    }
  } catch (error) {
    console.error("AI rate limit check failed", error instanceof Error ? error.message : String(error));
    return out(req, { ok: false, code: "RATE_LIMIT_UNAVAILABLE" }, 503);
  }

  const attempts: ProviderAttempt[] = [];
  const order = providerOrder();

  for (const provider of order) {
    const result = await callProvider(provider, messages, temperature, maxTokens);
    if (!result.ok) {
      attempts.push(result.attempt);
      continue;
    }

    return out(req, {
      ...result.payload,
      ok: true,
      provider: result.provider,
      model: result.model,
      fallback_used: attempts.length > 0,
    });
  }

  const configuredProviderExists = order.some((provider) => Boolean(providerConfig(provider).key));
  console.error("All AI providers failed", { attempts });
  return out(
    req,
    {
      ok: false,
      code: configuredProviderExists ? "ALL_AI_PROVIDERS_FAILED" : "AI_PROVIDERS_NOT_CONFIGURED",
      attempts,
    },
    503,
  );
});
