import { rpcArgs } from "@/dashboard/lib/rpcArgs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";
import { convertProductImageToWebp } from "@/dashboard/lib/imageProcessing";
import { STORE_CONFIG } from "@/lib/storeConfig";

type SettingRow = Tables<"cms_site_settings">;

export type DashboardSiteSettings = {
  siteName: string;
  logoUrl: string;
  taglineEn: string;
  taglineAr: string;
  whatsappNumber: string;
  storePhone: string;
  storeEmail: string;
  supportEmail: string;
  addressLine: string;
  city: string;
  countryCode: string;
  instagramUrl: string;
  facebookUrl: string;
  xUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  deliveryFee: string;
};

type SettingDefinition = {
  field: keyof DashboardSiteSettings;
  key: string;
  group: string;
  type: "text" | "url" | "number";
  label: string;
};

const DEFINITIONS: SettingDefinition[] = [
  { field: "siteName", key: "site_name", group: "branding", type: "text", label: "Store name" },
  { field: "logoUrl", key: "logo_url", group: "branding", type: "url", label: "Logo URL" },
  { field: "taglineEn", key: "tagline_en", group: "branding", type: "text", label: "Tagline (English)" },
  { field: "taglineAr", key: "tagline_ar", group: "branding", type: "text", label: "Tagline (Arabic)" },
  { field: "whatsappNumber", key: "whatsapp_number", group: "contact", type: "text", label: "WhatsApp number" },
  { field: "storePhone", key: "store_phone", group: "contact", type: "text", label: "Store phone" },
  { field: "storeEmail", key: "store_email", group: "contact", type: "text", label: "Store email" },
  { field: "supportEmail", key: "support_email", group: "contact", type: "text", label: "Support email" },
  { field: "addressLine", key: "address_line", group: "contact", type: "text", label: "Address" },
  { field: "city", key: "city", group: "contact", type: "text", label: "City" },
  { field: "countryCode", key: "country_code", group: "contact", type: "text", label: "Country code" },
  { field: "instagramUrl", key: "instagram_url", group: "social", type: "url", label: "Instagram" },
  { field: "facebookUrl", key: "facebook_url", group: "social", type: "url", label: "Facebook" },
  { field: "xUrl", key: "x_url", group: "social", type: "url", label: "X" },
  { field: "youtubeUrl", key: "youtube_url", group: "social", type: "url", label: "YouTube" },
  { field: "tiktokUrl", key: "tiktok_url", group: "social", type: "url", label: "TikTok" },
  { field: "deliveryFee", key: "delivery_fee", group: "commerce", type: "number", label: "Default delivery fee" },
];

const SETTINGS_BUCKET = "cms-media";
const SETTINGS_PREFIX = "settings/branding";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function fallbackSettings(): DashboardSiteSettings {
  return {
    siteName: STORE_CONFIG.name,
    logoUrl: "",
    taglineEn: "",
    taglineAr: "",
    whatsappNumber: STORE_CONFIG.whatsappNumber,
    storePhone: "",
    storeEmail: "",
    supportEmail: "",
    addressLine: "",
    city: "",
    countryCode: "",
    instagramUrl: STORE_CONFIG.socialInstagram,
    facebookUrl: STORE_CONFIG.socialFacebook,
    xUrl: STORE_CONFIG.socialX,
    youtubeUrl: STORE_CONFIG.socialYoutube,
    tiktokUrl: "",
    deliveryFee: "2.00",
  };
}

function validateOptionalHttpUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http:// or https://.`);
  }
  return parsed.toString();
}

function validateEmail(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`${label} is not a valid email address.`);
  }
  return trimmed;
}

export async function loadDashboardSiteSettings(): Promise<DashboardSiteSettings> {
  await requireDashboardStaff();

  const { data, error } = await supabase
    .from("cms_site_settings")
    .select("key,value_text")
    .in("key", DEFINITIONS.map((definition) => definition.key));

  throwIfError(error, "Loading store settings failed");

  const rows = (data ?? []) as Pick<SettingRow, "key" | "value_text">[];
  const byKey = new Map(rows.map((row) => [row.key, row.value_text ?? ""]));
  const next = fallbackSettings();

  for (const definition of DEFINITIONS) {
    const stored = byKey.get(definition.key)?.trim();
    if (stored) next[definition.field] = stored;
  }

  return next;
}

export async function saveDashboardSiteSettings(
  input: DashboardSiteSettings,
): Promise<DashboardSiteSettings> {
  const role = await requireDashboardStaff();

  const siteName = input.siteName.trim();
  if (siteName.length < 2 || siteName.length > 80) {
    throw new Error("Store name must be between 2 and 80 characters.");
  }

  const deliveryFeeRaw = input.deliveryFee.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(deliveryFeeRaw)) {
    throw new Error("Delivery fee must be a non-negative number with up to 2 decimals.");
  }
  const deliveryFeeNumber = Number(deliveryFeeRaw);
  if (!Number.isFinite(deliveryFeeNumber) || deliveryFeeNumber < 0 || deliveryFeeNumber > 10000) {
    throw new Error("Delivery fee must be between 0 and 10000.");
  }

  const normalized: DashboardSiteSettings = {
    siteName,
    logoUrl: validateOptionalHttpUrl(input.logoUrl, "Logo URL"),
    taglineEn: input.taglineEn.trim().slice(0, 180),
    taglineAr: input.taglineAr.trim().slice(0, 180),
    whatsappNumber: input.whatsappNumber.replace(/\D/g, ""),
    storePhone: input.storePhone.trim().slice(0, 40),
    storeEmail: validateEmail(input.storeEmail, "Store email"),
    supportEmail: validateEmail(input.supportEmail, "Support email"),
    addressLine: input.addressLine.trim().slice(0, 240),
    city: input.city.trim().slice(0, 100),
    countryCode: input.countryCode.trim().toUpperCase().slice(0, 2),
    instagramUrl: validateOptionalHttpUrl(input.instagramUrl, "Instagram URL"),
    facebookUrl: validateOptionalHttpUrl(input.facebookUrl, "Facebook URL"),
    xUrl: validateOptionalHttpUrl(input.xUrl, "X URL"),
    youtubeUrl: validateOptionalHttpUrl(input.youtubeUrl, "YouTube URL"),
    tiktokUrl: validateOptionalHttpUrl(input.tiktokUrl, "TikTok URL"),
    deliveryFee: deliveryFeeNumber.toFixed(2),
  };

  if (normalized.whatsappNumber && normalized.whatsappNumber.length < 7) {
    throw new Error("WhatsApp number is too short.");
  }

  if (role !== "admin") {
    const { data: currentDelivery, error: deliveryError } = await supabase
      .from("cms_site_settings")
      .select("value_text")
      .eq("key", "delivery_fee")
      .maybeSingle();
    throwIfError(deliveryError, "Loading protected delivery setting failed");
    normalized.deliveryFee = currentDelivery?.value_text?.trim() || "2.00";
  }

  const now = new Date().toISOString();
  const writableDefinitions =
    role === "admin"
      ? DEFINITIONS
      : DEFINITIONS.filter((definition) => definition.key !== "delivery_fee");
  const rows = writableDefinitions.map((definition) => ({
    key: definition.key,
    value_text: normalized[definition.field],
    value_json: null,
    value_type: definition.type,
    label: definition.label,
    group_name: definition.group,
    is_public: true,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("cms_site_settings")
    .upsert(rows, { onConflict: "key" });

  throwIfError(error, "Saving store settings failed");
  return normalized;
}

export async function uploadDashboardStoreLogo(file: File): Promise<string> {
  await requireDashboardStaff();

  const conversion = await convertProductImageToWebp(file, "1080");
  if (conversion.file.size > MAX_LOGO_BYTES) {
    throw new Error("Optimized logo must be 5 MB or smaller.");
  }

  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectPath = `${SETTINGS_PREFIX}/${unique}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(SETTINGS_BUCKET)
    .upload(objectPath, conversion.file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });
  throwIfError(uploadError, "Uploading store logo failed");

  const { data: publicUrl } = supabase.storage.from(SETTINGS_BUCKET).getPublicUrl(objectPath);

  const { error: assetError } = await supabase.rpc("register_cms_media_asset", rpcArgs({
    p_object_path: objectPath,
    p_file_name: conversion.file.name,
    p_mime_type: "image/webp",
    p_size_bytes: conversion.file.size,
    p_alt_text: "Space Call store logo",
  }));
  if (assetError) {
    console.warn("[dashboard-settings] logo uploaded but media registration failed", assetError.message);
  }

  return publicUrl.publicUrl;
}
