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
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
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

  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nowIso = new Date().toISOString();

  // Use select("*") for the localized content tables so this function stays
  // deploy-safe both immediately before and after the bilingual migration runs.
  // The response below still explicitly projects only storefront-safe fields.
  const [settingsResult, heroesResult, sectionsResult, navigationResult, brandsResult, seoResult] =
    await Promise.all([
      db
        .from("cms_site_settings")
        .select("key,value_text,value_json,value_type")
        .eq("is_public", true)
        .order("key"),
      db
        .from("cms_hero_slides")
        .select("*")
        .eq("is_published", true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("sort_order"),
      db.from("cms_sections").select("*").order("page_slug").order("sort_order"),
      db.from("cms_navigation_items").select("*").order("area").order("sort_order"),
      db
        .from("cms_brands")
        .select("id,name,slug,logo_url,href,sort_order,is_visible")
        .order("sort_order")
        .order("name"),
      db.from("cms_seo_pages").select("*").eq("is_public", true).order("page_slug"),
    ]);

  const firstError =
    settingsResult.error ||
    heroesResult.error ||
    sectionsResult.error ||
    navigationResult.error ||
    brandsResult.error ||
    seoResult.error;

  if (firstError) {
    console.error("public-cms query failed", firstError.message);
    return new Response(JSON.stringify({ error: "cms_query_failed" }), {
      status: 500,
      headers: headers(req),
    });
  }

  const heroSlides = (heroesResult.data ?? [])
    .filter((row) => typeof row.image_url === "string" && row.image_url.trim())
    .map((row) => ({
      id: row.id,
      title: row.title ?? null,
      title_en: row.title_en ?? null,
      title_ar: row.title_ar ?? null,
      subtitle: row.subtitle ?? null,
      subtitle_en: row.subtitle_en ?? null,
      subtitle_ar: row.subtitle_ar ?? null,
      image_url: row.image_url,
      mobile_image_url: row.mobile_image_url ?? null,
      button_label: row.button_label ?? null,
      button_label_en: row.button_label_en ?? null,
      button_label_ar: row.button_label_ar ?? null,
      target_type: row.target_type,
      target_value: row.target_value ?? null,
      sort_order: row.sort_order,
    }));

  const sections = (sectionsResult.data ?? []).map((row) => ({
    id: row.id,
    page_slug: row.page_slug,
    section_key: row.section_key,
    section_type: row.section_type,
    title: row.title ?? null,
    title_en: row.title_en ?? null,
    title_ar: row.title_ar ?? null,
    subtitle: row.subtitle ?? null,
    subtitle_en: row.subtitle_en ?? null,
    subtitle_ar: row.subtitle_ar ?? null,
    content: row.content ?? {},
    content_en: row.content_en ?? null,
    content_ar: row.content_ar ?? null,
    sort_order: row.sort_order,
    is_visible: row.is_visible,
  }));

  const navigation = (navigationResult.data ?? []).map((row) => ({
    id: row.id,
    area: row.area,
    label: row.label,
    label_en: row.label_en ?? null,
    label_ar: row.label_ar ?? null,
    icon_type: row.icon_type,
    icon_value: row.icon_value ?? null,
    href: row.href ?? null,
    sort_order: row.sort_order,
    is_visible: row.is_visible,
  }));

  const seoPages = (seoResult.data ?? []).map((row) => ({
    page_slug: row.page_slug,
    title: row.title ?? null,
    title_en: row.title_en ?? null,
    title_ar: row.title_ar ?? null,
    description: row.description ?? null,
    description_en: row.description_en ?? null,
    description_ar: row.description_ar ?? null,
    og_image_url: row.og_image_url ?? null,
    canonical_url: row.canonical_url ?? null,
    robots: row.robots,
    json_ld: row.json_ld ?? {},
    is_public: row.is_public,
  }));

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
      sections,
      navigation,
      brands: brandsResult.data ?? [],
      seoPages,
    }),
    { status: 200, headers: headers(req) },
  );
});
