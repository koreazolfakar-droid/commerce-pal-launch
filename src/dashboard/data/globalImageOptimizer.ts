import { getDashboardRole } from "@/dashboard/data/catalog";
import {
  replaceDashboardMediaAssetWithWebp,
  type DashboardMediaAsset,
} from "@/dashboard/data/media";
import { supabase } from "@/integrations/supabase/client";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

export type GlobalImageSource = "media" | "product" | "brand" | "category" | "hero";

export type GlobalLegacyImageAsset = {
  key: string;
  source: GlobalImageSource;
  recordId: string;
  field: string;
  label: string;
  url: string;
  mimeType: string;
  sizeBytes: number | null;
  bucketId?: string;
  objectPath?: string;
  fileName: string;
};

const OUTPUT_BUCKET = "cms-media";
const OUTPUT_PREFIX = "optimized";
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardAdmin() {
  const role = await getDashboardRole();
  if (role !== "admin") throw new Error("Only dashboard admins can optimize existing media.");
}

function mimeFromUrl(url: string) {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".avif")) return "image/avif";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function fileNameFromUrl(url: string, fallback: string) {
  try {
    const value = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return value || fallback;
  } catch {
    return fallback;
  }
}

function asset(
  source: GlobalImageSource,
  recordId: string,
  field: string,
  label: string,
  url: string,
  extra: Partial<GlobalLegacyImageAsset> = {},
): GlobalLegacyImageAsset {
  return {
    key: `${source}:${recordId}:${field}`,
    source,
    recordId,
    field,
    label,
    url,
    mimeType: extra.mimeType ?? mimeFromUrl(url),
    sizeBytes: extra.sizeBytes ?? null,
    fileName: extra.fileName ?? fileNameFromUrl(url, `${source}-image`),
    ...(extra.bucketId ? { bucketId: extra.bucketId } : {}),
    ...(extra.objectPath ? { objectPath: extra.objectPath } : {}),
  };
}

export async function loadGlobalLegacyImageAssets(): Promise<GlobalLegacyImageAsset[]> {
  await requireDashboardAdmin();

  const [
    mediaResult,
    productImageResult,
    productResult,
    brandResult,
    categoryResult,
    heroResult,
  ] = await Promise.all([
    supabase
      .from("cms_media_assets")
      .select("id,bucket_id,object_path,file_name,mime_type,size_bytes")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("store_product_images")
      .select("id,product_id,url")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("store_products").select("id,title").limit(1000),
    supabase.from("cms_brands").select("id,name,logo_url,cover_image_url").limit(1000),
    supabase.from("store_categories").select("id,name,image_url").limit(1000),
    supabase
      .from("cms_hero_slides")
      .select("id,title,title_en,image_url,mobile_image_url")
      .limit(1000),
  ]);

  throwIfError(mediaResult.error, "Loading media assets failed");
  throwIfError(productImageResult.error, "Loading product images failed");
  throwIfError(productResult.error, "Loading product names failed");
  throwIfError(brandResult.error, "Loading brand images failed");
  throwIfError(categoryResult.error, "Loading category images failed");
  throwIfError(heroResult.error, "Loading hero images failed");

  const productNames = new Map(
    (productResult.data ?? []).map((row) => [row.id, row.title || "Product"]),
  );
  const rows: GlobalLegacyImageAsset[] = [];

  for (const row of mediaResult.data ?? []) {
    const { data: publicUrl } = supabase.storage.from(row.bucket_id).getPublicUrl(row.object_path);
    if (!publicUrl.publicUrl) continue;
    rows.push(
      asset("media", row.id, "object_path", row.file_name || "Media asset", publicUrl.publicUrl, {
        mimeType: row.mime_type ?? "",
        sizeBytes: row.size_bytes,
        fileName: row.file_name,
        bucketId: row.bucket_id,
        objectPath: row.object_path,
      }),
    );
  }

  for (const row of productImageResult.data ?? []) {
    if (!row.url) continue;
    rows.push(
      asset(
        "product",
        row.id,
        "url",
        productNames.get(row.product_id) ?? "Product image",
        row.url,
      ),
    );
  }

  for (const row of brandResult.data ?? []) {
    if (row.logo_url) rows.push(asset("brand", row.id, "logo_url", `${row.name} · Logo`, row.logo_url));
    if (row.cover_image_url) {
      rows.push(asset("brand", row.id, "cover_image_url", `${row.name} · Cover`, row.cover_image_url));
    }
  }

  for (const row of categoryResult.data ?? []) {
    if (row.image_url) rows.push(asset("category", row.id, "image_url", row.name, row.image_url));
  }

  for (const row of heroResult.data ?? []) {
    const title = row.title_en || row.title || "Hero slide";
    if (row.image_url) rows.push(asset("hero", row.id, "image_url", `${title} · Desktop`, row.image_url));
    if (row.mobile_image_url) {
      rows.push(asset("hero", row.id, "mobile_image_url", `${title} · Mobile`, row.mobile_image_url));
    }
  }

  return rows;
}

export async function downloadGlobalLegacyImage(assetRow: GlobalLegacyImageAsset): Promise<File> {
  await requireDashboardAdmin();
  const response = await fetch(assetRow.url, { cache: "no-store", mode: "cors" });
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  const blob = await response.blob();
  const mimeType = blob.type || assetRow.mimeType || mimeFromUrl(assetRow.url);
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(mimeType)) {
    throw new Error(`Unsupported legacy format: ${mimeType || "unknown"}.`);
  }
  return new File([blob], assetRow.fileName || "legacy-image", {
    type: mimeType,
    lastModified: Date.now(),
  });
}

async function uploadOptimizedFile(assetRow: GlobalLegacyImageAsset, output: File) {
  if (output.type !== "image/webp") throw new Error("Optimized output must be WebP.");
  if (output.size <= 0) throw new Error("Optimized output is empty.");
  if (output.size > MAX_OUTPUT_BYTES) throw new Error("Optimized image must be 10 MB or smaller.");

  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const day = new Date().toISOString().slice(0, 10);
  const objectPath = `${OUTPUT_PREFIX}/${assetRow.source}/${day}/${unique}.webp`;

  const { error } = await supabase.storage.from(OUTPUT_BUCKET).upload(objectPath, output, {
    cacheControl: "31536000",
    upsert: false,
    contentType: "image/webp",
  });
  throwIfError(error, "Uploading optimized image failed");
  const { data } = supabase.storage.from(OUTPUT_BUCKET).getPublicUrl(objectPath);
  return { objectPath, url: data.publicUrl };
}

export async function replaceGlobalLegacyImageWithWebp(
  assetRow: GlobalLegacyImageAsset,
  output: File,
): Promise<GlobalLegacyImageAsset> {
  await requireDashboardAdmin();

  if (assetRow.source === "media") {
    if (!assetRow.bucketId || !assetRow.objectPath) {
      throw new Error("Media storage metadata is incomplete.");
    }
    const saved = await replaceDashboardMediaAssetWithWebp(
      {
        id: assetRow.recordId,
        bucketId: assetRow.bucketId,
        objectPath: assetRow.objectPath,
        fileName: assetRow.fileName,
        mimeType: assetRow.mimeType,
        sizeBytes: assetRow.sizeBytes,
        altText: "",
        url: assetRow.url,
        createdAt: "",
        updatedAt: "",
      } satisfies DashboardMediaAsset,
      output,
    );
    return {
      ...assetRow,
      url: saved.url,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      fileName: saved.fileName,
    };
  }

  const uploaded = await uploadOptimizedFile(assetRow, output);
  let error: { message: string } | null = null;

  if (assetRow.source === "product") {
    ({ error } = await supabase
      .from("store_product_images")
      .update({ url: uploaded.url })
      .eq("id", assetRow.recordId));
  } else if (assetRow.source === "brand") {
    const payload =
      assetRow.field === "logo_url"
        ? { logo_url: uploaded.url }
        : { cover_image_url: uploaded.url };
    ({ error } = await supabase.from("cms_brands").update(payload).eq("id", assetRow.recordId));
  } else if (assetRow.source === "category") {
    ({ error } = await supabase
      .from("store_categories")
      .update({ image_url: uploaded.url })
      .eq("id", assetRow.recordId));
  } else if (assetRow.source === "hero") {
    const payload =
      assetRow.field === "mobile_image_url"
        ? { mobile_image_url: uploaded.url }
        : { image_url: uploaded.url };
    ({ error } = await supabase
      .from("cms_hero_slides")
      .update(payload)
      .eq("id", assetRow.recordId));
  }

  if (error) {
    await supabase.storage.from(OUTPUT_BUCKET).remove([uploaded.objectPath]).catch(() => undefined);
    throw new Error(`Updating ${assetRow.source} image reference failed: ${error.message}`);
  }

  invalidateNativeStoreCache();
  return {
    ...assetRow,
    url: uploaded.url,
    mimeType: "image/webp",
    sizeBytes: output.size,
    fileName: output.name,
    bucketId: OUTPUT_BUCKET,
    objectPath: uploaded.objectPath,
  };
}
