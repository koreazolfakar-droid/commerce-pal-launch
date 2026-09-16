import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const ALLOWED_ORIGINS = new Set(["https://spacecallapp.store", "https://www.spacecallapp.store"]);

function headers(req: Request) {
  const origin = req.headers.get("origin")?.trim() || "";
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    "X-Content-Type-Options": "nosniff",
  };
}

function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed.default ?? Object.values(parsed)[0];
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      // Ignore malformed secret JSON and fall back to SUPABASE_SERVICE_ROLE_KEY.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")?.trim() || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: headers(req),
    });
  }
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: headers(req),
    });
  }

  const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const secret = serviceKey();
  if (!url || !secret) {
    return new Response(JSON.stringify({ error: "server_not_configured" }), {
      status: 500,
      headers: headers(req),
    });
  }

  // The public storefront reads CMS content only through this service-role
  // projection. Dashboard users write directly to the same canonical tables,
  // where RLS limits access to admin/editor staff.
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [settingsResult, heroesResult, sectionsResult, navigationResult] = await Promise.all([
    db.from("cms_settings").select("key,value").order("key"),
    db
      .from("cms_hero_slides")
      .select(
        "id,title,subtitle,image_url,mobile_image_url,button_label,target_type,target_value,sort_order",
      )
      .eq("is_visible", true)
      .order("sort_order"),
    db
      .from("cms_sections")
      .select("id,page_slug,section_key,section_type,title,subtitle,content,sort_order")
      .eq("is_visible", true)
      .order("page_slug")
      .order("sort_order"),
    db
      .from("cms_navigation")
      .select("id,area,label,icon_type,icon_value,href,sort_order")
      .eq("is_visible", true)
      .order("area")
      .order("sort_order"),
  ]);

  const firstError =
    settingsResult.error || heroesResult.error || sectionsResult.error || navigationResult.error;
  if (firstError) {
    console.error("public-cms query failed", firstError.message);
    return new Response(JSON.stringify({ error: "cms_query_failed" }), {
      status: 500,
      headers: headers(req),
    });
  }

  const settings = Object.fromEntries(
    (settingsResult.data ?? []).map((row) => [row.key, row.value]),
  );

  return new Response(
    JSON.stringify({
      settings,
      heroSlides: heroesResult.data ?? [],
      sections: (sectionsResult.data ?? []).map((row) => ({ ...row, is_visible: true })),
      navigation: (navigationResult.data ?? []).map((row) => ({ ...row, is_visible: true })),
    }),
    { status: 200, headers: headers(req) },
  );
});
