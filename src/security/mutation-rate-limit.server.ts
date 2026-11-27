import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MutationRateLimitDecision = {
  allowed: boolean;
  retryAfter: number;
  unavailable?: boolean;
};

type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
};

function runtimeEnvValue(env: unknown, key: string) {
  if (!env || typeof env !== "object") return "";
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function syncServerSupabaseEnv(env: unknown) {
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    if (process.env[key]) continue;
    const value = runtimeEnvValue(env, key);
    if (value) process.env[key] = value;
  }
}

function clientAddress(request: Request) {
  const direct =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("true-client-ip") ??
    request.headers.get("x-real-ip");
  if (direct) return direct.trim().slice(0, 160);

  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim().slice(0, 160) || "unknown";
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function consumeSharedMutationRateLimit(
  request: Request,
  env: unknown,
  options: RateLimitOptions,
): Promise<MutationRateLimitDecision> {
  syncServerSupabaseEnv(env);

  const addressHash = await sha256(`mutation|${clientAddress(request)}`);
  const key = `server-mutation:${addressHash}`;

  try {
    const { data, error } = await supabaseAdmin.rpc("consume_edge_rate_limit", {
      _key: key,
      _window_seconds: options.windowSeconds,
      _limit: options.limit,
    });

    if (error) throw error;
    const decision = Array.isArray(data) ? data[0] : null;
    if (!decision || typeof decision.allowed !== "boolean") {
      throw new Error("Shared rate limiter returned no decision.");
    }

    const resetAt = new Date(decision.reset_at).getTime();
    const retryAfter =
      decision.allowed || !Number.isFinite(resetAt)
        ? 0
        : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

    return { allowed: decision.allowed, retryAfter };
  } catch (error) {
    console.error("[security] shared mutation rate limiter unavailable", error);
    return { allowed: false, retryAfter: 1, unavailable: true };
  }
}
