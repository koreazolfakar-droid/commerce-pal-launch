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
    } catch {}
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

  // Direct PostgREST reads of CMS source tables are disabled. This server-only
  // gateway is the sole public projection and exposes only publishable fields.
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nowIso = new Date().toISOString();

  const [settingsResult, heroesResult, sectionsResult, navigationResult] = await Promise.all([
    db
      .from("cms_site_settings")
      .select("key,value_text,value_json,value_type")
      .eq("is_public", true)
      .order("key"),
    db
      .from("cms_hero_slides")
      .select(
        "id,title,subtitle,image_url,mobile_image_url,button_label,target_type,target_value,sort_order,starts_at,ends_at",
      )
      .eq("is_published", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("sort_order"),
    db
      .from("cms_sections")
      .select("id,page_slug,section_key,section_type,title,subtitle,content,sort_order")
      .eq("is_visible", true)
      .order("page_slug")
      .order("sort_order"),
    db
      .from("cms_navigation_items")
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

  const heroSlides = (heroesResult.data ?? [])
    .filter((row) => typeof row.image_url === "string" && row.image_url.trim())
    .map(({ starts_at: _startsAt, ends_at: _endsAt, ...slide }) => slide);

  const settings = Object.fromEntries(
    (settingsResult.data ?? []).map((row) => {
      let value: unknown = row.value_text;
      if (row.value_type === "json") value = row.value_json;
      else if (row.value_type === "boolean") value = row.value_text === "true";
      else if (row.value_type === "number") {
        const parsed = Number(row.value_text);
        value = Number.isFinite(parsed) ? parsed : null;
      }
      return [row.key, value];
    }),
  );

  return new Response(
    JSON.stringify({
      settings,
      heroSlides,
      sections: (sectionsResult.data ?? []).map((row) => ({ ...row, is_visible: true })),
      navigation: (navigationResult.data ?? []).map((row) => ({ ...row, is_visible: true })),
    }),
    { status: 200, headers: headers(req) },
  );
});
