import { supabase } from "@/integrations/supabase/client";

const BUCKET = "cms-media";
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
]);

/** Uploads a dashboard image and returns the bucket's durable public URL. */
export async function uploadMedia(file: File, folder = "general"): Promise<string> {
  if (file.size > MAX_MEDIA_BYTES) throw new Error("حجم الصورة يجب ألا يتجاوز 10MB");
  if (file.type && !ALLOWED_MEDIA_TYPES.has(file.type)) {
    throw new Error("صيغة الصورة غير مدعومة");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "general";
  const path = `${safeFolder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("تعذّر إنشاء رابط الصورة");
  return data.publicUrl;
}
