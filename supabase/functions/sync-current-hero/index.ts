import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const DESKTOP_TARGET = "hero/current-desktop";
const MOBILE_TARGET = "hero/current-mobile";
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

async function sourceBlob(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("hero_source_must_be_https");

  const response = await fetch(parsed, { redirect: "follow" });
  if (!response.ok) throw new Error(`hero_source_http_${response.status}`);

  const type = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
  if (!type.startsWith("image/")) throw new Error("hero_source_not_image");

  const length = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_SOURCE_BYTES) {
    throw new Error("hero_source_too_large");
  }

  const blob = await response.blob();
  if (blob.size > MAX_SOURCE_BYTES) throw new Error("hero_source_too_large");
  return { blob, type: blob.type || type || "application/octet-stream" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: CORS,
    });
  }

  const auth = req.headers.get("Authorization")?.trim() || "";
  const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const publicKey =
    Deno.env.get("SUPABASE_ANON_KEY")?.trim() ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim() ||
    "";

  if (!auth.startsWith("Bearer ") || !url || !publicKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: CORS,
    });
  }

  const db = createClient(url, publicKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const { data: hero, error: heroError } = await db
    .from("cms_hero_slides")
    .select("image_url,mobile_image_url,sort_order")
    .eq("is_published", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (heroError) {
    return new Response(JSON.stringify({ error: "hero_read_denied" }), {
      status: 403,
      headers: CORS,
    });
  }

  const storage = db.storage.from("cms-media");

  async function upload(target: string, blob: Blob, contentType: string) {
    const { error } = await storage.upload(target, blob, {
      upsert: true,
      cacheControl: "60",
      contentType,
    });
    if (error) throw error;
  }

  try {
    if (!hero?.image_url) {
      const blank = new Blob(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'],
        { type: "image/svg+xml" },
      );
      await Promise.all([
        upload(DESKTOP_TARGET, blank, "image/svg+xml"),
        upload(MOBILE_TARGET, blank, "image/svg+xml"),
      ]);
      return new Response(JSON.stringify({ ok: true, active: false }), {
        status: 200,
        headers: CORS,
      });
    }

    const [desktop, mobile] = await Promise.all([
      sourceBlob(hero.image_url),
      sourceBlob(hero.mobile_image_url || hero.image_url),
    ]);

    await Promise.all([
      upload(DESKTOP_TARGET, desktop.blob, desktop.type),
      upload(MOBILE_TARGET, mobile.blob, mobile.type),
    ]);

    return new Response(JSON.stringify({ ok: true, active: true }), {
      status: 200,
      headers: CORS,
    });
  } catch (error) {
    console.error("sync-current-hero failed", error);
    return new Response(JSON.stringify({ error: "hero_sync_failed" }), {
      status: 500,
      headers: CORS,
    });
  }
});
