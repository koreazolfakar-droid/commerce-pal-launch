import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { fetchTrustedHeroImage } from "../_shared/trustedHeroSource.ts";

const allowedOrigins = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "https://app.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);
const previewSuffixes = [
  ".lovable.app", ".lovableproject.com", ".lovableproject-dev.com",
  ".gpt-eng.com", ".gptengineer.run",
];

function originAllowed(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" &&
      !url.username && !url.password &&
      previewSuffixes.some((suffix) => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin")?.trim() ?? "";
  return {
    ...(originAllowed(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

const DESKTOP_TARGET = "hero/current-desktop";
const MOBILE_TARGET = "hero/current-mobile";
Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get("origin")?.trim();
  if (requestOrigin && !originAllowed(requestOrigin)) {
    return json(req, { error: "origin_not_allowed" }, 403);
  }
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 1024) {
    return json(req, { error: "payload_too_large" }, 413);
  }

  const authorization = req.headers.get("authorization")?.trim() ?? "";
  const token = /^Bearer ([A-Za-z0-9._-]{1,4096})$/i.exec(authorization)?.[1];
  const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const publicKey =
    Deno.env.get("SUPABASE_ANON_KEY")?.trim() ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim() ||
    "";

  if (!token || !url || !publicKey) return json(req, { error: "unauthorized" }, 401);

  const db = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Do not treat a Bearer prefix or a publicly readable hero as permission to
  // make privileged outbound network requests and overwrite stable assets.
  const { data: identity, error: identityError } = await db.auth.getUser(token);
  if (identityError || !identity.user) return json(req, { error: "unauthorized" }, 401);

  const { data: access, error: accessError } = await db.rpc("dashboard_staff_access_ready");
  if (accessError) return json(req, { error: "authorization_unavailable" }, 503);
  if (access !== true) return json(req, { error: "staff_verification_required" }, 403);

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
      headers: cors(req),
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
      // Existing Storage policy only permits raster images. Upload an inert
      // 1x1 transparent PNG instead of SVG, which Storage rejects and can be
      // active content when viewed as an independent document.
      const transparentPng = Uint8Array.from(
        atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGBgAAAABQABeqhXUAAAAABJRU5ErkJggg=="),
        (character) => character.charCodeAt(0),
      );
      const blank = new Blob([transparentPng], { type: "image/png" });
      await Promise.all([
        upload(DESKTOP_TARGET, blank, "image/png"),
        upload(MOBILE_TARGET, blank, "image/png"),
      ]);
      return new Response(JSON.stringify({ ok: true, active: false }), {
        status: 200,
        headers: cors(req),
      });
    }

    const [desktop, mobile] = await Promise.all([
      fetchTrustedHeroImage(hero.image_url, url),
      fetchTrustedHeroImage(hero.mobile_image_url || hero.image_url, url),
    ]);

    await Promise.all([
      upload(DESKTOP_TARGET, desktop.blob, desktop.type),
      upload(MOBILE_TARGET, mobile.blob, mobile.type),
    ]);

    return new Response(JSON.stringify({ ok: true, active: true }), {
      status: 200,
      headers: cors(req),
    });
  } catch (error) {
    console.error("sync-current-hero failed", error instanceof Error ? error.message : "unknown_error");
    return new Response(JSON.stringify({ error: "hero_sync_failed" }), {
      status: 500,
      headers: cors(req),
    });
  }
});
