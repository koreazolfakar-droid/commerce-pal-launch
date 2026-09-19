import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const DEFAULT_SUPABASE_URL = "https://rtwyankpxtffqqrasyzw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iJlqEj16CQ7YKOqAjYWaGQ_LiszVYE0";

export function getPublicSupabaseConfig() {
  const viteEnv = import.meta.env as Record<string, string | undefined>;
  const nodeEnv = typeof process !== "undefined" ? process.env : undefined;

  return {
    url: viteEnv["VITE_SUPABASE_URL"] || nodeEnv?.["SUPABASE_URL"] || DEFAULT_SUPABASE_URL,
    key:
      viteEnv["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      nodeEnv?.["SUPABASE_PUBLISHABLE_KEY"] ||
      DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}

function createPublicSupabaseClient() {
  const { url, key } = getPublicSupabaseConfig();
  return createClient<Database>(url, key, {
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
