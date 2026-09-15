import { uploadCmsMedia, type DashboardUploadMime } from "@/lib/cmsAdmin.functions";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set<DashboardUploadMime>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      if (comma < 0) reject(new Error("Could not encode image"));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

/** Upload through the authenticated server boundary; no storage write key reaches the browser. */
export async function uploadMedia(file: File, folder = "general"): Promise<string> {
  if (file.size <= 0) throw new Error("الصورة فارغة");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("حجم الصورة يجب أن يكون أقل من 5 MB");

  const mimeType = file.type as DashboardUploadMime;
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("الصيغة غير مدعومة. استخدم JPG أو PNG أو WebP أو AVIF");
  }

  const safeFolder = folder
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base64 = await readBase64(file);
  const result = await uploadCmsMedia({
    fileName: file.name,
    mimeType,
    base64,
    folder: safeFolder || "general",
  });
  return result.url;
}
