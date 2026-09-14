import { supabase } from "@/integrations/supabase/client";

const BUCKET = "cms-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

/** Uploads an image to the dashboard media library and returns a durable URL. */
export async function uploadMedia(file: File, folder = "general"): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    throw signed.error ?? new Error("Could not create a media link");
  }
  return signed.data.signedUrl;
}
