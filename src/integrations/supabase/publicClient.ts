import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const DEFAULT_SUPABASE_URL = "https://rtwyankpxtffqqrasyzw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iJlqEj16CQ7YKOqAjYWaGQ_LiszVYE0";

function publicSupabaseConfig() {
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

const { url, key } = publicSupabaseConfig();

/**
 * Public storefront client.
 *
 * This client deliberately has no browser auth storage and no session refresh.
 * It is safe to use from TanStack Start SSR loaders and public browser queries.
 * Dashboard authentication continues to use the normal authenticated client.
 */
export const publicSupabase = createClient<Database>(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
