export type DashboardThrottleDecision = {
  allowed: boolean;
  retryAfter: number;
  remainingBeforeBlock?: number;
};

/**
 * Treat all malformed pre-auth throttle responses as service failures, never
 * as permission to continue. The Edge Function is an auxiliary guard; native
 * Supabase CAPTCHA and Auth limits must still protect direct Auth API calls.
 */
export function parseDashboardThrottleDecision(value: unknown): DashboardThrottleDecision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.allowed !== "boolean") return null;

  const retryAfter =
    typeof payload.retryAfter === "number" &&
    Number.isFinite(payload.retryAfter) &&
    payload.retryAfter >= 0
      ? Math.ceil(payload.retryAfter)
      : payload.allowed
        ? 0
        : 60;

  const remainingBeforeBlock =
    typeof payload.remainingBeforeBlock === "number" &&
    Number.isFinite(payload.remainingBeforeBlock) &&
    payload.remainingBeforeBlock >= 0
      ? Math.floor(payload.remainingBeforeBlock)
      : undefined;

  return {
    allowed: payload.allowed,
    retryAfter,
    ...(remainingBeforeBlock !== undefined ? { remainingBeforeBlock } : {}),
  };
}
