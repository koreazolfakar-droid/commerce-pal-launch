import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "npm:@imagemagick/magick-wasm@0.0.30";

const BUCKET = "cms-media";
const DERIVED_ROOT = "_responsive/v1";
const ALLOWED_WIDTHS = new Set([160, 240, 320, 480, 640, 828, 960, 1280, 1600, 1920]);
const MAX_PROCESSING_BYTES = 8 * 1024 * 1024;
const WEBP_QUALITY = 92;
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30")),
);
await initializeImageMagick(wasmBytes);

function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed.default ?? Object.values(parsed)[0];
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      // Fall through to the legacy service-role environment variable.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}

function baseHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Cache-Control": IMMUTABLE_CACHE,
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  };
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...baseHeaders(),
      "Cache-Control": status >= 400 ? "no-store" : IMMUTABLE_CACHE,
    },
  });
}

function normalizeSourcePath(value: string | null) {
  if (!value) return null;
  const path = value.trim().replace(/^\/+/, "");
  if (
    !path ||
    path.length > 1200 ||
    path.includes("\0") ||
    path.includes("\\") ||
    path.split("/").some((part) => part === "..") ||
    path.startsWith(`${DERIVED_ROOT}/`)
  ) return null;
  if (!(path.startsWith("products/") || path.startsWith("hero/"))) return null;
  return path;
}

function derivedPath(sourcePath: string, width: number) {
  const slash = sourcePath.lastIndexOf("/");
  const dot = sourcePath.lastIndexOf(".");
  const stem = dot > slash ? sourcePath.slice(0, dot) : sourcePath;
  return `${DERIVED_ROOT}/${stem}/${width}.webp`;
}

function preservedMasterPath(sourcePath: string) {
  return sourcePath.endsWith("/display.webp")
    ? `${sourcePath.slice(0, -"/display.webp".length)}/master.original`
    : null;
}

function splitObjectPath(path: string) {
  const slash = path.lastIndexOf("/");
  return slash < 0
    ? { folder: "", name: path }
    : { folder: path.slice(0, slash), name: path.slice(slash + 1) };
}

async function objectExists(
  storage: ReturnType<ReturnType<typeof createClient>["storage"]["from"]>,
  path: string,
) {
  const { folder, name } = splitObjectPath(path);
  const { data, error } = await storage.list(folder, {
    limit: 1,
    search: name,
  });
  if (error) return false;
  return (data ?? []).some((item) => item.name === name);
}

async function isRegisteredSource(
  db: ReturnType<typeof createClient>,
  sourcePath: string,
  publicUrl: string,
) {
  if (sourcePath.startsWith("products/")) {
    const { data, error } = await db
      .from("store_product_images")
      .select("id")
      .eq("url", publicUrl)
      .limit(1)
      .maybeSingle();
    return !error && Boolean(data);
  }

  const [desktop, mobile] = await Promise.all([
    db
      .from("cms_hero_slides")
      .select("id")
      .eq("image_url", publicUrl)
      .limit(1)
      .maybeSingle(),
    db
      .from("cms_hero_slides")
      .select("id")
      .eq("mobile_image_url", publicUrl)
      .limit(1)
      .maybeSingle(),
  ]);
  return (!desktop.error && Boolean(desktop.data)) || (!mobile.error && Boolean(mobile.data));
}

function resizeToWebp(input: Uint8Array, requestedWidth: number) {
  let output = new Uint8Array();
  ImageMagick.read(input, (image) => {
    const targetWidth = Math.max(1, Math.min(requestedWidth, image.width));
    if (targetWidth < image.width) image.resize(targetWidth, 0);
    image.quality = WEBP_QUALITY;
    image.write(MagickFormat.WebP, (data) => {
      output = new Uint8Array(data);
    });
  });
  if (!output.length) throw new Error("image_encode_failed");
  return output;
}

async function downloadForProcessing(
  storage: ReturnType<ReturnType<typeof createClient>["storage"]["from"]>,
  sourcePath: string,
) {
  const masterPath = preservedMasterPath(sourcePath);
  const candidates =
    masterPath && (await objectExists(storage, masterPath))
      ? [masterPath, sourcePath]
      : [sourcePath];

  for (const path of candidates) {
    const { data, error } = await storage.download(path);
    if (error || !data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (!bytes.length) continue;
    if (bytes.byteLength <= MAX_PROCESSING_BYTES) return bytes;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders() });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(405, { error: "method_not_allowed" });
  }

  const url = new URL(req.url);
  const sourcePath = normalizeSourcePath(url.searchParams.get("path"));
  const width = Number(url.searchParams.get("w"));
  if (!sourcePath || !Number.isInteger(width) || !ALLOWED_WIDTHS.has(width)) {
    return json(400, { error: "invalid_image_request" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const secret = serviceKey();
  if (!supabaseUrl || !secret) {
    return json(500, { error: "server_not_configured" });
  }

  const db = createClient(supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const storage = db.storage.from(BUCKET);
  const { data: sourcePublic } = storage.getPublicUrl(sourcePath);
  const sourcePublicUrl = sourcePublic.publicUrl;

  if (!(await isRegisteredSource(db, sourcePath, sourcePublicUrl))) {
    return json(404, { error: "image_not_registered" });
  }

  const outputPath = derivedPath(sourcePath, width);
  const { data: derivedPublic } = storage.getPublicUrl(outputPath);
  const derivedPublicUrl = derivedPublic.publicUrl;

  if (await objectExists(storage, outputPath)) {
    return new Response(null, {
      status: 302,
      headers: {
        ...baseHeaders("image/webp"),
        Location: derivedPublicUrl,
      },
    });
  }

  if (req.method === "HEAD") {
    return new Response(null, {
      status: 404,
      headers: { ...baseHeaders(), "Cache-Control": "no-store" },
    });
  }

  const sourceBytes = await downloadForProcessing(storage, sourcePath);
  if (!sourceBytes) {
    return json(413, { error: "source_image_too_large_or_missing" });
  }

  let webp: Uint8Array;
  try {
    webp = resizeToWebp(sourceBytes, width);
  } catch (error) {
    console.error("responsive-image conversion failed", error);
    return json(422, { error: "image_conversion_failed" });
  }

  const { error: uploadError } = await storage.upload(
    outputPath,
    new Blob([webp], { type: "image/webp" }),
    {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: true,
    },
  );
  if (uploadError) {
    console.error("responsive-image upload failed", uploadError.message);
    return json(500, { error: "variant_upload_failed" });
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...baseHeaders("image/webp"),
      Location: derivedPublicUrl,
    },
  });
});
