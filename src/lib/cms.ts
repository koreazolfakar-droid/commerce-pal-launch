import { createServerFn } from "@tanstack/react-start";

export type CmsJsonValue =
  string | number | boolean | null | CmsJsonValue[] | { [key: string]: CmsJsonValue };

export type CmsSettingValue = CmsJsonValue;

export type CmsHeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  button_label: string | null;
  target_type: "url" | "product" | "collection" | "none";
  target_value: string | null;
  sort_order: number;
};

export type CmsSection = {
  id: string;
  page_slug: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: { [key: string]: CmsJsonValue };
  sort_order: number;
  is_visible: boolean;
};

export type CmsNavigationItem = {
  id: string;
  area: "header" | "bottom" | "footer" | "mobile_menu" | "trust";
  label: string;
  icon_type: "lucide" | "image" | "svg" | "none";
  icon_value: string | null;
  href: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type CmsSnapshot = {
  settings: Record<string, CmsSettingValue>;
  heroSlides: CmsHeroSlide[];
  sections: CmsSection[];
  navigation: CmsNavigationItem[];
};

export const EMPTY_CMS: CmsSnapshot = {
  settings: {},
  heroSlides: [],
  sections: [],
  navigation: [],
};

const CMS_CACHE_TTL_MS = 60_000;
let cmsCache: { value: CmsSnapshot; expiresAt: number } | null = null;
let cmsPendingRequest: Promise<CmsSnapshot> | null = null;

function isCmsSnapshot(value: unknown): value is CmsSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<CmsSnapshot>;
  return (
    !!record.settings &&
    typeof record.settings === "object" &&
    Array.isArray(record.heroSlides) &&
    Array.isArray(record.sections) &&
    Array.isArray(record.navigation)
  );
}

async function loadCmsSnapshot(): Promise<CmsSnapshot> {
  const baseUrl = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
  const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim();
  if (!baseUrl) return EMPTY_CMS;

  try {
    const headers = new Headers({ Accept: "application/json" });
    if (publishableKey) headers.set("apikey", publishableKey);

    const response = await fetch(`${baseUrl}/functions/v1/public-cms`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`public-cms returned ${response.status}`);

    const payload: unknown = await response.json();
    return isCmsSnapshot(payload) ? payload : EMPTY_CMS;
  } catch (error) {
    console.warn("Space Call dashboard content is unavailable; using storefront defaults", error);
    return EMPTY_CMS;
  }
}

/**
 * Public storefront snapshot. The browser never receives direct CMS table access;
 * this server function reads only the curated public-cms Edge Function projection.
 */
const cmsSnapshotFn = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cmsCache && cmsCache.expiresAt > now) return cmsCache.value;
  if (cmsPendingRequest) return cmsPendingRequest;

  const request = loadCmsSnapshot()
    .then((value) => {
      cmsCache = { value, expiresAt: Date.now() + CMS_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      cmsPendingRequest = null;
    });

  cmsPendingRequest = request;
  return request;
});

export async function fetchCmsSnapshot(): Promise<CmsSnapshot> {
  return cmsSnapshotFn();
}

export function cmsText(snapshot: CmsSnapshot, key: string) {
  const value = snapshot.settings[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
