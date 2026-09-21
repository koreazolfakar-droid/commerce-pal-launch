import { rpcArgs } from "@/dashboard/lib/rpcArgs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";
import { convertProductImageToWebp } from "@/dashboard/lib/imageProcessing";

type MediaRow = Tables<"cms_media_assets">;

export type DashboardMediaAsset = {
  id: string;
  bucketId: string;
  objectPath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  altText: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

const BUCKET = "cms-media";
const LIBRARY_PREFIX = "library";
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_STORED_BYTES = 10 * 1024 * 1024;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function mapMedia(row: MediaRow): DashboardMediaAsset {
  const { data: publicUrl } = supabase.storage.from(row.bucket_id).getPublicUrl(row.object_path);
  return {
    id: row.id,
    bucketId: row.bucket_id,
    objectPath: row.object_path,
    fileName: row.file_name,
    mimeType: row.mime_type ?? "",
    sizeBytes: row.size_bytes,
    altText: row.alt_text ?? "",
    url: publicUrl.publicUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadDashboardMediaWorkspace(): Promise<{
  assets: DashboardMediaAsset[];
  role: DashboardRole;
}> {
  const role = await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_media_assets")
    .select("*")
    .eq("bucket_id", BUCKET)
    .order("created_at", { ascending: false })
    .limit(300);

  throwIfError(error, "Loading media library failed");
  return { assets: ((data ?? []) as MediaRow[]).map(mapMedia), role };
}

export async function uploadDashboardMediaImage(
  file: File,
  altText = "",
): Promise<DashboardMediaAsset> {
  await requireDashboardStaff();
  if (file.size <= 0) throw new Error("The selected image is empty.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Image must be 20 MB or smaller.");

  const conversion = await convertProductImageToWebp(file, "1920");
  if (conversion.file.size > MAX_STORED_BYTES) {
    throw new Error("Optimized image must be 10 MB or smaller.");
  }
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const day = new Date().toISOString().slice(0, 10);
  const objectPath = `${LIBRARY_PREFIX}/${day}/${unique}.webp`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(
    objectPath,
    conversion.file,
    {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    },
  );
  throwIfError(uploadError, "Uploading media failed");

  try {
    const { data, error } = await supabase.rpc("register_cms_media_asset", rpcArgs({
      p_object_path: objectPath,
      p_file_name: conversion.file.name,
      p_mime_type: "image/webp",
      p_size_bytes: conversion.file.size,
      p_alt_text: altText.trim() || null,
    }));
    throwIfError(error, "Registering media failed");
    return mapMedia(data as MediaRow);
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw error;
  }
}

export async function updateDashboardMediaAltText(
  id: string,
  altText: string,
): Promise<DashboardMediaAsset> {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_media_assets")
    .update({ alt_text: altText.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "Updating media alt text failed");
  return mapMedia(data as MediaRow);
}

export async function deleteDashboardMediaAsset(asset: DashboardMediaAsset): Promise<void> {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can delete media.");

  const { error: deleteRowError } = await supabase.from("cms_media_assets").delete().eq("id", asset.id);
  throwIfError(deleteRowError, "Deleting media record failed");

  const { error: storageError } = await supabase.storage.from(asset.bucketId).remove([asset.objectPath]);
  if (storageError) {
    console.warn("[dashboard-media] database row deleted but storage cleanup failed", storageError.message);
  }
}


export async function downloadDashboardMediaAsset(asset: DashboardMediaAsset): Promise<File> {
  await requireDashboardStaff();
  const response = await fetch(asset.url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Downloading ${asset.fileName} failed (${response.status}).`);
  const blob = await response.blob();
  const mimeType = blob.type || asset.mimeType || "image/jpeg";
  return new File([blob], asset.fileName || "media-image", {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export async function replaceDashboardMediaAssetWithWebp(
  asset: DashboardMediaAsset,
  output: File,
): Promise<DashboardMediaAsset> {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can bulk-optimize media.");
  if (output.type !== "image/webp") throw new Error("Optimized output must be WebP.");
  if (output.size <= 0) throw new Error("Optimized image is empty.");
  if (output.size > MAX_STORED_BYTES) throw new Error("Optimized image must be 10 MB or smaller.");

  const backupResponse = await fetch(asset.url, { cache: "no-store" });
  if (!backupResponse.ok) {
    throw new Error(`Unable to create a backup for ${asset.fileName}.`);
  }
  const backupBlob = await backupResponse.blob();
  const backupType = backupBlob.type || asset.mimeType || "application/octet-stream";

  const { error: uploadError } = await supabase.storage.from(asset.bucketId).upload(
    asset.objectPath,
    output,
    {
      cacheControl: "31536000",
      upsert: true,
      contentType: "image/webp",
    },
  );
  throwIfError(uploadError, "Replacing media with WebP failed");

  const nextFileName = asset.fileName.replace(/\.[^.]+$/, "") + ".webp";
  const { data, error: updateError } = await supabase
    .from("cms_media_assets")
    .update({
      file_name: nextFileName,
      mime_type: "image/webp",
      size_bytes: output.size,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asset.id)
    .select("*")
    .single();

  if (updateError) {
    const backupFile = new File([backupBlob], asset.fileName || "media-backup", {
      type: backupType,
      lastModified: Date.now(),
    });
    const { error: rollbackError } = await supabase.storage.from(asset.bucketId).upload(
      asset.objectPath,
      backupFile,
      {
        cacheControl: "31536000",
        upsert: true,
        contentType: backupType,
      },
    );
    if (rollbackError) {
      console.error("[dashboard-media] rollback failed", rollbackError.message);
    }
    throw new Error(`Updating media metadata failed: ${updateError.message}`);
  }

  return mapMedia(data as MediaRow);
}
