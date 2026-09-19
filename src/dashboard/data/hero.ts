import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";
import {
  convertProductImageToWebp,
  type ProductImageSourceInfo,
  type ProductImageResolution,
} from "@/dashboard/lib/imageProcessing";

type HeroRow = Tables<"cms_hero_slides">;
type MediaRow = Tables<"cms_media_assets">;
type ProductRow = Pick<Tables<"store_products">, "id" | "title" | "handle" | "status">;
type CollectionRow = Pick<Tables<"store_collections">, "id" | "title" | "handle" | "is_active">;

export type HeroTargetType = "url" | "product" | "collection" | "none";
export type HeroAlignment = "start" | "center" | "end";
export type HeroButtonStyle = "primary" | "secondary" | "light" | "dark";

export type DashboardHeroSlide = {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  imageUrl: string;
  mobileImageUrl: string;
  imageAltEn: string;
  imageAltAr: string;
  mobileImageAltEn: string;
  mobileImageAltAr: string;
  buttonLabelEn: string;
  buttonLabelAr: string;
  targetType: HeroTargetType;
  targetValue: string;
  sortOrder: number;
  isPublished: boolean;
  startsAt: string;
  endsAt: string;
  contentAlignment: HeroAlignment;
  overlayOpacity: number;
  buttonStyle: HeroButtonStyle;
  openInNewTab: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardHeroInput = Omit<
  DashboardHeroSlide,
  "id" | "sortOrder" | "createdAt" | "updatedAt"
>;

export type DashboardHeroLinkOption = {
  id: string;
  label: string;
  value: string;
  status: string;
};

export type DashboardHeroMediaAsset = {
  id: string;
  url: string;
  objectPath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  altText: string;
  createdAt: string;
};

export type HeroImageTarget = "desktop" | "mobile";

export type DashboardHeroImageInfo = {
  name: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  bytes: number;
};

export type DashboardHeroImageOptimization = {
  target: HeroImageTarget;
  mode: "webp" | "passthrough";
  resolution: ProductImageResolution | null;
  source: DashboardHeroImageInfo;
  output: DashboardHeroImageInfo;
  note: string;
};

export type DashboardHeroImageUploadResult = {
  asset: DashboardHeroMediaAsset;
  optimization: DashboardHeroImageOptimization;
};

const HERO_BUCKET = "cms-media";
const HERO_PREFIX = "hero";
const MAX_HERO_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_HERO_STORED_BYTES = 10 * 1024 * 1024;
const WEBP_CONVERTIBLE_HERO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const ALLOWED_HERO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
]);

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function mapHero(row: HeroRow): DashboardHeroSlide {
  return {
    id: row.id,
    titleEn: row.title_en ?? row.title ?? "",
    titleAr: row.title_ar ?? "",
    subtitleEn: row.subtitle_en ?? row.subtitle ?? "",
    subtitleAr: row.subtitle_ar ?? "",
    imageUrl: row.image_url ?? "",
    mobileImageUrl: row.mobile_image_url ?? "",
    imageAltEn: row.image_alt_en ?? "",
    imageAltAr: row.image_alt_ar ?? "",
    mobileImageAltEn: row.mobile_image_alt_en ?? "",
    mobileImageAltAr: row.mobile_image_alt_ar ?? "",
    buttonLabelEn: row.button_label_en ?? row.button_label ?? "",
    buttonLabelAr: row.button_label_ar ?? "",
    targetType: row.target_type as HeroTargetType,
    targetValue: row.target_value ?? "",
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? "",
    contentAlignment: row.content_alignment as HeroAlignment,
    overlayOpacity: row.overlay_opacity,
    buttonStyle: row.button_style as HeroButtonStyle,
    openInNewTab: row.open_in_new_tab,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeOptionalTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid hero schedule date.");
  return date.toISOString();
}

function heroRpcPayload(input: DashboardHeroInput) {
  return {
    p_title_en: input.titleEn || null,
    p_title_ar: input.titleAr || null,
    p_subtitle_en: input.subtitleEn || null,
    p_subtitle_ar: input.subtitleAr || null,
    p_image_url: input.imageUrl || null,
    p_mobile_image_url: input.mobileImageUrl || null,
    p_image_alt_en: input.imageAltEn || null,
    p_image_alt_ar: input.imageAltAr || null,
    p_mobile_image_alt_en: input.mobileImageAltEn || null,
    p_mobile_image_alt_ar: input.mobileImageAltAr || null,
    p_button_label_en: input.buttonLabelEn || null,
    p_button_label_ar: input.buttonLabelAr || null,
    p_target_type: input.targetType,
    p_target_value: input.targetType === "none" ? null : input.targetValue || null,
    p_is_published: input.isPublished,
    p_starts_at: normalizeOptionalTimestamp(input.startsAt),
    p_ends_at: normalizeOptionalTimestamp(input.endsAt),
    p_content_alignment: input.contentAlignment,
    p_overlay_opacity: input.overlayOpacity,
    p_button_style: input.buttonStyle,
    p_open_in_new_tab: input.openInNewTab,
  };
}

export async function listDashboardHeroSlides(): Promise<DashboardHeroSlide[]> {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_hero_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  throwIfError(error, "Loading hero slides failed");
  return ((data ?? []) as HeroRow[]).map(mapHero);
}

export async function createDashboardHeroSlide(
  input: DashboardHeroInput,
): Promise<DashboardHeroSlide | null> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("create_cms_hero_slide", heroRpcPayload(input));
  throwIfError(error, "Creating hero slide failed");
  return data ? mapHero(data as HeroRow) : null;
}

export async function updateDashboardHeroSlide(
  id: string,
  input: DashboardHeroInput,
): Promise<DashboardHeroSlide | null> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("update_cms_hero_slide", {
    p_slide_id: id,
    ...heroRpcPayload(input),
  });
  throwIfError(error, "Updating hero slide failed");
  return data ? mapHero(data as HeroRow) : null;
}

export async function deleteDashboardHeroSlide(id: string): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("delete_cms_hero_slide", { p_slide_id: id });
  throwIfError(error, "Deleting hero slide failed");
}

export async function reorderDashboardHeroSlides(
  slides: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("reorder_cms_hero_slides", {
    p_items: slides.map((slide) => ({ id: slide.id, sort_order: slide.sortOrder })),
  });
  throwIfError(error, "Reordering hero slides failed");
}

export async function listDashboardHeroLinkOptions(): Promise<{
  products: DashboardHeroLinkOption[];
  collections: DashboardHeroLinkOption[];
}> {
  await requireDashboardStaff();

  const [productsResult, collectionsResult] = await Promise.all([
    supabase
      .from("store_products")
      .select("id,title,handle,status")
      .order("title", { ascending: true }),
    supabase
      .from("store_collections")
      .select("id,title,handle,is_active")
      .order("title", { ascending: true }),
  ]);

  throwIfError(productsResult.error, "Loading hero product links failed");
  throwIfError(collectionsResult.error, "Loading hero collection links failed");

  return {
    products: ((productsResult.data ?? []) as ProductRow[]).map((row) => ({
      id: row.id,
      label: row.title,
      value: row.handle,
      status: row.status,
    })),
    collections: ((collectionsResult.data ?? []) as CollectionRow[]).map((row) => ({
      id: row.id,
      label: row.title,
      value: row.handle,
      status: row.is_active ? "active" : "draft",
    })),
  };
}

export async function listDashboardHeroMedia(): Promise<DashboardHeroMediaAsset[]> {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_media_assets")
    .select("*")
    .eq("bucket_id", HERO_BUCKET)
    .like("object_path", `${HERO_PREFIX}/%`)
    .order("created_at", { ascending: false })
    .limit(100);

  throwIfError(error, "Loading hero media failed");

  return ((data ?? []) as MediaRow[]).map((row) => {
    const { data: publicUrl } = supabase.storage.from(HERO_BUCKET).getPublicUrl(row.object_path);
    return {
      id: row.id,
      url: publicUrl.publicUrl,
      objectPath: row.object_path,
      fileName: row.file_name,
      mimeType: row.mime_type ?? "",
      sizeBytes: row.size_bytes,
      altText: row.alt_text ?? "",
      createdAt: row.created_at,
    };
  });
}

function safeFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName;
  const subtype = file.type.split("/")[1]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return subtype || "bin";
}

function heroImageInfoFromConversion(info: ProductImageSourceInfo): DashboardHeroImageInfo {
  return {
    name: info.name,
    mimeType: info.mimeType,
    width: info.width,
    height: info.height,
    bytes: info.bytes,
  };
}

function passthroughHeroImageInfo(file: File): DashboardHeroImageInfo {
  return {
    name: file.name,
    mimeType: file.type,
    width: null,
    height: null,
    bytes: file.size,
  };
}

export async function uploadDashboardHeroImage(
  file: File,
  altText = "",
  target: HeroImageTarget = "desktop",
): Promise<DashboardHeroImageUploadResult> {
  await requireDashboardStaff();

  if (!ALLOWED_HERO_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use JPG, PNG, WebP, AVIF, GIF, SVG, HEIC or HEIF.");
  }
  if (file.size <= 0) throw new Error("Image file is empty.");
  if (file.size > MAX_HERO_SOURCE_BYTES) throw new Error("Hero source images must be 20MB or smaller.");

  const targetResolution: ProductImageResolution = target === "mobile" ? "1080" : "1920";
  let storedFile = file;
  let extension = safeFileExtension(file);
  let optimization: DashboardHeroImageOptimization;

  if (WEBP_CONVERTIBLE_HERO_MIME_TYPES.has(file.type)) {
    // Conversion happens before Storage upload. If conversion fails, the original file is never uploaded.
    const conversion = await convertProductImageToWebp(file, targetResolution);
    storedFile = conversion.file;
    extension = "webp";
    optimization = {
      target,
      mode: "webp",
      resolution: targetResolution,
      source: heroImageInfoFromConversion(conversion.source),
      output: heroImageInfoFromConversion(conversion.output),
      note: `Converted to WebP before upload (max ${targetResolution}px edge).`,
    };
  } else {
    const info = passthroughHeroImageInfo(file);
    optimization = {
      target,
      mode: "passthrough",
      resolution: null,
      source: info,
      output: info,
      note:
        file.type === "image/gif"
          ? "GIF preserved to keep animation."
          : file.type === "image/svg+xml"
            ? "SVG preserved to keep vector quality."
            : "HEIC/HEIF preserved because browser-side WebP conversion support is not reliable.",
    };
  }

  if (storedFile.size > MAX_HERO_STORED_BYTES) {
    throw new Error("Optimized hero image must be 10MB or smaller.");
  }

  const unique = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectPath = `${HERO_PREFIX}/${new Date().toISOString().slice(0, 10)}/${unique}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(HERO_BUCKET).upload(
    objectPath,
    storedFile,
    {
      cacheControl: "31536000",
      upsert: false,
      contentType: storedFile.type,
    },
  );
  throwIfError(uploadError, "Uploading hero image failed");

  try {
    const { data: asset, error: assetError } = await supabase.rpc("register_cms_media_asset", {
      p_object_path: objectPath,
      p_file_name: storedFile.name,
      p_mime_type: storedFile.type,
      p_size_bytes: storedFile.size,
      p_alt_text: altText || null,
    });
    throwIfError(assetError, "Registering hero image failed");

    const row = asset as MediaRow;
    const { data: publicUrl } = supabase.storage.from(HERO_BUCKET).getPublicUrl(objectPath);
    return {
      asset: {
        id: row.id,
        url: publicUrl.publicUrl,
        objectPath,
        fileName: row.file_name,
        mimeType: row.mime_type ?? storedFile.type,
        sizeBytes: row.size_bytes,
        altText: row.alt_text ?? altText,
        createdAt: row.created_at,
      },
      optimization,
    };
  } catch (error) {
    await supabase.storage.from(HERO_BUCKET).remove([objectPath]);
    throw error;
  }
}

export function getHeroScheduleState(slide: Pick<
  DashboardHeroSlide,
  "isPublished" | "startsAt" | "endsAt"
>) {
  if (!slide.isPublished) return "draft" as const;
  const now = Date.now();
  const start = slide.startsAt ? new Date(slide.startsAt).getTime() : null;
  const end = slide.endsAt ? new Date(slide.endsAt).getTime() : null;
  if (start && start > now) return "scheduled" as const;
  if (end && end <= now) return "expired" as const;
  return "live" as const;
}
