import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const DEFAULT_SUPABASE_URL = "https://rtwyankpxtffqqrasyzw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iJlqEj16CQ7YKOqAjYWaGQ_LiszVYE0";
const CANONICAL_SUPABASE_HOST = "rtwyankpxtffqqrasyzw.supabase.co";

function isCanonicalSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === CANONICAL_SUPABASE_HOST;
  } catch {
    return false;
  }
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export function getPublicSupabaseConfig() {
  const viteEnv = import.meta.env as Record<string, string | undefined>;
  const nodeEnv = typeof process !== "undefined" ? process.env : undefined;

  const viteUrl = viteEnv["VITE_SUPABASE_URL"];
  const nodeUrl = nodeEnv?.["SUPABASE_URL"];

  if (isCanonicalSupabaseUrl(viteUrl)) {
    return {
      url: viteUrl,
      key: viteEnv["VITE_SUPABASE_PUBLISHABLE_KEY"] || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  if (isCanonicalSupabaseUrl(nodeUrl)) {
    return {
      url: nodeUrl,
      key: nodeEnv?.["SUPABASE_PUBLISHABLE_KEY"] || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  // Public storefront reads must never drift to another Supabase project because
  // a hosting runtime still has stale environment variables. Dashboard/private
  // server integrations keep their own independently configured clients.
  return {
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}

function createPublicSupabaseClient() {
  const { url, key } = getPublicSupabaseConfig();
  return createClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

let publicClient: ReturnType<typeof createPublicSupabaseClient> | undefined;

/**
 * Public storefront client.
 *
 * The client is created lazily so SSR module evaluation never depends on
 * Supabase initialization. Requests begin only when the native storefront
 * data layer actually needs the public client.
 */
export const publicSupabase = new Proxy(
  {} as ReturnType<typeof createPublicSupabaseClient>,
  {
    get(_, prop, receiver) {
      if (!publicClient) publicClient = createPublicSupabaseClient();
      return Reflect.get(publicClient, prop, receiver);
    },
  },
);
