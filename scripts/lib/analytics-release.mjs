const requirements = [
  {
    rpc: "get_dashboard_analytics_snapshot",
    args: {
      p_start: "2000-01-01T00:00:00.000Z",
      p_end: "2000-01-02T00:00:00.000Z",
      p_compare: false,
      p_currency: "USD",
    },
  },
  {
    rpc: "get_dashboard_inventory_alerts",
    args: { p_search: "", p_status: "all", p_sort: "severity", p_page: 1, p_page_size: 1 },
  },
];

function validateConfig({ url, key }) {
  let endpoint;
  try {
    endpoint = new URL(url);
  } catch {
    throw new Error("Release check requires a valid HTTPS Supabase project URL.");
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error("Release check requires a valid HTTPS Supabase project URL.");
  if (typeof key !== "string" || !key || /\s/.test(key))
    throw new Error("Release check requires a public Supabase key.");
  if (key.startsWith("sb_publishable_")) return { url: endpoint.origin, key };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role === "anon")
        return { url: endpoint.origin, key };
    } catch {
      /* Reject malformed public keys without logging their content. */
    }
  }
  throw new Error(
    "Release check requires a public publishable or legacy anon key; privileged credentials are not allowed.",
  );
}

export function resolveAnalyticsReleaseConfig(env, defaults) {
  return validateConfig({
    url: env.VITE_SUPABASE_URL || env.SUPABASE_URL || defaults.url,
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || defaults.key,
  });
}

/** Read existing browser defaults without importing the authenticated client or duplicating keys. */
export function publicSupabaseDefaults(source) {
  const url = source.match(/const DEFAULT_SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
  const key = source.match(/const DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
  if (!url || !key)
    throw new Error(
      "Cannot resolve the browser public Supabase defaults. Update the release configuration reader.",
    );
  return validateConfig({ url, key });
}

/** Probe existence and anonymous denial, never a staff session or a successful data response. */
export async function checkAnalyticsRelease(config, fetcher = globalThis.fetch) {
  const { url, key } = validateConfig(config);
  const checks = await Promise.all(
    requirements.map(async ({ rpc, args }) => {
      const result = (status) => ({ rpc, status });
      try {
        const headers = {
          apikey: key,
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (!key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${key}`;
        const response = await fetcher(`${url}/rest/v1/rpc/${rpc}`, {
          method: "POST",
          headers,
          body: JSON.stringify(args),
          redirect: "error",
          credentials: "omit",
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) {
          // A public data response is a failed release check. Discard without reading or logging it.
          await response.body?.cancel?.().catch(() => undefined);
          return result("unsafe-access");
        }
        if (
          response.redirected ||
          response.status >= 500 ||
          (response.status >= 300 && response.status < 400)
        )
          return result("unavailable");
        const payload = await response.json().catch(() => null);
        if (!payload || typeof payload !== "object") return result("unexpected-response");
        if (
          [401, 403].includes(response.status) &&
          payload.code === "42501" &&
          payload.message === `permission denied for function ${rpc}`
        )
          return result("ready");
        if (payload.code === "PGRST202" || payload.code === "42883")
          return result("missing-schema");
        if (payload.code === "P0001" && payload.message === "dashboard staff required")
          return result("unsafe-access");
        if (payload.code === "PGRST301" || payload.message === "Invalid API key")
          return result("invalid-credentials");
        return result("unexpected-response");
      } catch {
        return result("unavailable");
      }
    }),
  );
  return { ready: checks.every((check) => check.status === "ready"), checks };
}
