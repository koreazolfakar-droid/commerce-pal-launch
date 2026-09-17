import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

// These are public Supabase connection values, not secrets. Server environment
// variables still take priority so the project can rotate them without code changes.
const DEFAULT_SUPABASE_URL = "https://rtwyankpxtffqqrasyzw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iJlqEj16CQ7YKOqAjYWaGQ_LiszVYE0";

function createAuthenticatedSupabase(accessToken: string) {
  const url = process.env["SUPABASE_URL"]?.trim() || DEFAULT_SUPABASE_URL;
  const publishableKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return createClient<Database>(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Verifies a browser Supabase session on the server and confirms the caller has
 * a dashboard role. This never uses the service-role key and never grants roles.
 */
export async function requireDashboardStaff(accessToken: string) {
  if (!accessToken || accessToken.split(".").length !== 3) {
    throw new Error("Unauthorized dashboard request");
  }

  const supabase = createAuthenticatedSupabase(accessToken);
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(accessToken);
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new Error("Unauthorized dashboard request");
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError) {
    throw new Error("Unable to verify dashboard permissions");
  }

  const role = (roles ?? []).find((row) => row.role === "admin" || row.role === "editor")?.role;
  if (role !== "admin" && role !== "editor") {
    throw new Error("Forbidden dashboard request");
  }

  return { userId, role } as const;
}
