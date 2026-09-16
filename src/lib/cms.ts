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

const LIVE_SUPABASE_PROJECT_REF = "rtwyankpxtffqqrasyzw";
const DEFAULT_SUPABASE_URL = `https://${LIVE_SUPABASE_PROJECT_REF}.supabase.co`;
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iJlqEj16CQ7YKOqAjYWaGQ_LiszVYE0";

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

function getCmsSupabaseConfig() {
  const envUrl = process.env["SUPABASE_URL"]?.trim().replace(/\/$/, "") || "";
  const usingLiveProject = envUrl.includes(`${LIVE_SUPABASE_PROJECT_REF}.supabase.co`);

  return {
    baseUrl: usingLiveProject ? envUrl : DEFAULT_SUPABASE_URL,
    publishableKey:
      (usingLiveProject ? process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim() : "") ||
      DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}

async function loadCmsSnapshot(): Promise<CmsSnapshot> {
  const { baseUrl, publishableKey } = getCmsSupabaseConfig();

  try {
    const headers = new Headers({
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      apikey: publishableKey,
    });

    const response = await fetch(`${baseUrl}/functions/v1/public-cms?fresh=${Date.now()}`, {
      method: "GET",
      headers,
      cache: "no-store",
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
 * Requests are intentionally uncached so Dashboard publishes become visible immediately.
 */
const cmsSnapshotFn = createServerFn({ method: "GET" }).handler(async () => {
  if (cmsPendingRequest) return cmsPendingRequest;

  const request = loadCmsSnapshot().finally(() => {
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
