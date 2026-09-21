import { getPublicSupabaseConfig } from "@/integrations/supabase/publicClient";

export type CmsJsonValue =
  string | number | boolean | null | CmsJsonValue[] | { [key: string]: CmsJsonValue };

export type CmsSettingValue = CmsJsonValue;
export type CmsLocale = "en" | "ar";

export type CmsHeroVisualConfig = Partial<import("./heroDesign").HeroVisualConfig>;

export type CmsHeroSlide = {
  id: string;
  title: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  subtitle: string | null;
  subtitle_en?: string | null;
  subtitle_ar?: string | null;
  eyebrow?: string | null;
  eyebrow_en?: string | null;
  eyebrow_ar?: string | null;
  image_url: string;
  mobile_image_url: string | null;
  image_alt_en?: string | null;
  image_alt_ar?: string | null;
  mobile_image_alt_en?: string | null;
  mobile_image_alt_ar?: string | null;
  button_label: string | null;
  button_label_en?: string | null;
  button_label_ar?: string | null;
  target_type: "url" | "product" | "collection" | "none";
  target_value: string | null;
  secondary_button_label?: string | null;
  secondary_button_label_en?: string | null;
  secondary_button_label_ar?: string | null;
  secondary_target_type?: "url" | "product" | "collection" | "none";
  secondary_target_value?: string | null;
  sort_order: number;
  content_alignment?: "start" | "center" | "end";
  overlay_opacity?: number;
  button_style?: "primary" | "secondary" | "light" | "dark";
  secondary_button_style?: "primary" | "secondary" | "light" | "dark";
  content_theme?: "light" | "dark" | "glass";
  open_in_new_tab?: boolean;
  secondary_open_in_new_tab?: boolean;
  visual_config?: CmsHeroVisualConfig | null;
};

export type CmsSection = {
  id: string;
  page_slug: string;
  section_key: string;
  section_type: string;
  title: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  subtitle: string | null;
  subtitle_en?: string | null;
  subtitle_ar?: string | null;
  content: { [key: string]: CmsJsonValue };
  content_en?: { [key: string]: CmsJsonValue } | null;
  content_ar?: { [key: string]: CmsJsonValue } | null;
  sort_order: number;
  is_visible: boolean;
};

export type CmsNavigationItem = {
  id: string;
  area: "header" | "bottom" | "footer" | "mobile_menu" | "trust";
  label: string;
  label_en?: string | null;
  label_ar?: string | null;
  icon_type: "lucide" | "image" | "svg" | "none";
  icon_value: string | null;
  href: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type CmsBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  href: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type CmsSeoPage = {
  page_slug: string;
  title: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  description: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  robots: string;
  json_ld: { [key: string]: CmsJsonValue };
  is_public: boolean;
};

export type CmsSnapshot = {
  settings: Record<string, CmsSettingValue>;
  heroSlides: CmsHeroSlide[];
  sections: CmsSection[];
  navigation: CmsNavigationItem[];
  brands: CmsBrand[];
  seoPages: CmsSeoPage[];
};

export const EMPTY_CMS: CmsSnapshot = {
  settings: {},
  heroSlides: [],
  sections: [],
  navigation: [],
  brands: [],
  seoPages: [],
};

const ARABIC_SCRIPT = /[\u0600-\u06ff]/;

const CMS_PUBLIC_READ_TIMEOUT_MS = 4_000;
const CMS_MEMORY_FRESH_MS = 30_000;
const CMS_MEMORY_STALE_MS = 5 * 60_000;
// The production database lives in Sydney. Keep the database-heavy CMS
// function in the same region to avoid an extra cross-region DB round trip.
const CMS_FUNCTION_REGION = "ap-southeast-2";

let cmsMemoryCache:
  | {
      freshUntil: number;
      staleUntil: number;
      value: CmsSnapshot;
    }
  | null = null;
let pendingCmsRefresh: Promise<CmsSnapshot> | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCmsSnapshot(value: unknown): CmsSnapshot {
  if (!isObject(value)) return EMPTY_CMS;

  return {
    settings: isObject(value.settings) ? (value.settings as Record<string, CmsSettingValue>) : {},
    heroSlides: Array.isArray(value.heroSlides) ? (value.heroSlides as CmsHeroSlide[]) : [],
    sections: Array.isArray(value.sections) ? (value.sections as CmsSection[]) : [],
    navigation: Array.isArray(value.navigation)
      ? (value.navigation as CmsNavigationItem[])
      : [],
    brands: Array.isArray(value.brands) ? (value.brands as CmsBrand[]) : [],
    seoPages: Array.isArray(value.seoPages) ? (value.seoPages as CmsSeoPage[]) : [],
  };
}

/**
 * Public CMS snapshot.
 *
 * The storefront reads only through the public-cms Edge Function. Direct anon
 * table reads stay denied by RLS. CMS is resilient by design: a timeout,
 * deployment issue or malformed response returns EMPTY_CMS so storefront
 * commerce data can continue rendering without a fatal error.
 */
async function requestCmsSnapshot(): Promise<CmsSnapshot | null> {
  const { url, key } = getPublicSupabaseConfig();
  if (!url || !key) return EMPTY_CMS;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), CMS_PUBLIC_READ_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/functions/v1/public-cms?forceFunctionRegion=${CMS_FUNCTION_REGION}`, {
      method: "GET",
      cache: "default",
      headers: {
        apikey: key,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[CMS] public-cms returned HTTP ${response.status}`);
      return null;
    }

    return normalizeCmsSnapshot(await response.json());
  } catch (error) {
    console.warn("[CMS] public-cms unavailable; storefront fallbacks remain active.", error);
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function startCmsRefresh(): Promise<CmsSnapshot> {
  if (!pendingCmsRefresh) {
    pendingCmsRefresh = requestCmsSnapshot()
      .then((snapshot) => {
        if (!snapshot) return cmsMemoryCache?.value ?? EMPTY_CMS;

        const now = Date.now();
        cmsMemoryCache = {
          freshUntil: now + CMS_MEMORY_FRESH_MS,
          staleUntil: now + CMS_MEMORY_FRESH_MS + CMS_MEMORY_STALE_MS,
          value: snapshot,
        };
        return snapshot;
      })
      .finally(() => {
        pendingCmsRefresh = null;
      });
  }

  return pendingCmsRefresh;
}

/**
 * Read the public CMS with a small process-local stale-while-revalidate layer.
 *
 * SSR requests within the fresh window return immediately without another edge
 * round-trip. During the stale window the last good snapshot is served while
 * one refresh runs in the background. A failed refresh never replaces a known
 * good snapshot.
 */
export async function fetchCmsSnapshot(): Promise<CmsSnapshot> {
  const now = Date.now();

  if (cmsMemoryCache && cmsMemoryCache.freshUntil > now) {
    return cmsMemoryCache.value;
  }

  if (cmsMemoryCache && cmsMemoryCache.staleUntil > now) {
    void startCmsRefresh();
    return cmsMemoryCache.value;
  }

  return startCmsRefresh();
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function containsArabic(value: CmsJsonValue): boolean {
  if (typeof value === "string") return ARABIC_SCRIPT.test(value);
  if (Array.isArray(value)) return value.some(containsArabic);
  if (value && typeof value === "object") return Object.values(value).some(containsArabic);
  return false;
}

export function localizedCmsText(
  language: CmsLocale,
  english: unknown,
  arabic: unknown,
  legacy?: unknown,
) {
  const preferred = cleanText(language === "ar" ? arabic : english);
  if (preferred) return preferred;

  const fallback = cleanText(legacy);
  if (!fallback) return undefined;
  const isArabic = ARABIC_SCRIPT.test(fallback);
  return language === "ar" ? (isArabic ? fallback : undefined) : isArabic ? undefined : fallback;
}

export function localizeHeroSlide(slide: CmsHeroSlide, language: CmsLocale): CmsHeroSlide {
  return {
    ...slide,
    title: localizedCmsText(language, slide.title_en, slide.title_ar, slide.title) ?? null,
    subtitle:
      localizedCmsText(language, slide.subtitle_en, slide.subtitle_ar, slide.subtitle) ?? null,
    eyebrow: localizedCmsText(language, slide.eyebrow_en, slide.eyebrow_ar, slide.eyebrow) ?? null,
    button_label:
      localizedCmsText(
        language,
        slide.button_label_en,
        slide.button_label_ar,
        slide.button_label,
      ) ?? null,
    secondary_button_label:
      localizedCmsText(
        language,
        slide.secondary_button_label_en,
        slide.secondary_button_label_ar,
        slide.secondary_button_label,
      ) ?? null,
  };
}

export function localizeNavigationItem(
  item: CmsNavigationItem,
  language: CmsLocale,
): CmsNavigationItem | null {
  const label = localizedCmsText(language, item.label_en, item.label_ar, item.label);
  return label ? { ...item, label } : null;
}

export function localizeSection(section: CmsSection, language: CmsLocale): CmsSection {
  const localizedContent = language === "ar" ? section.content_ar : section.content_en;
  const legacyContentMatchesLanguage =
    language === "ar" ? containsArabic(section.content) : !containsArabic(section.content);

  return {
    ...section,
    title: localizedCmsText(language, section.title_en, section.title_ar, section.title) ?? null,
    subtitle:
      localizedCmsText(language, section.subtitle_en, section.subtitle_ar, section.subtitle) ??
      null,
    content: localizedContent ?? (legacyContentMatchesLanguage ? section.content : {}),
  };
}

export function cmsText(snapshot: CmsSnapshot, key: string) {
  const value = snapshot.settings[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function cmsLocalizedSetting(snapshot: CmsSnapshot, key: string, language: CmsLocale) {
  const explicit = cmsText(snapshot, `${key}_${language}`);
  if (explicit) return explicit;
  return localizedCmsText(language, undefined, undefined, cmsText(snapshot, key));
}

export function cmsSeoPage(snapshot: CmsSnapshot, pageSlug: string, language: CmsLocale = "en") {
  const normalized = pageSlug.replace(/^\/+|\/+$/g, "") || "home";
  const page = snapshot.seoPages.find(
    (candidate) => candidate.is_public && candidate.page_slug === normalized,
  );
  if (!page) return undefined;

  return {
    ...page,
    title: localizedCmsText(language, page.title_en, page.title_ar, page.title) ?? null,
    description:
      localizedCmsText(language, page.description_en, page.description_ar, page.description) ??
      null,
  };
}

