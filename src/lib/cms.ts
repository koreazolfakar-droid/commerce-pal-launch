export type CmsJsonValue =
  string | number | boolean | null | CmsJsonValue[] | { [key: string]: CmsJsonValue };

export type CmsSettingValue = CmsJsonValue;
export type CmsLocale = "en" | "ar";

export type CmsHeroSlide = {
  id: string;
  title: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  subtitle: string | null;
  subtitle_en?: string | null;
  subtitle_ar?: string | null;
  image_url: string;
  mobile_image_url: string | null;
  button_label: string | null;
  button_label_en?: string | null;
  button_label_ar?: string | null;
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

/**
 * The storefront is intentionally Shopify-only.
 *
 * Dashboard/CMS editors remain available under /dashboard, but public storefront
 * code no longer reads their Supabase projection. Keeping this compatibility
 * function returning an empty snapshot lets existing presentational components
 * fall back to their built-in copy without introducing a second runtime source
 * of truth or a refresh race against Shopify.
 */
export async function fetchCmsSnapshot(): Promise<CmsSnapshot> {
  return EMPTY_CMS;
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
    button_label:
      localizedCmsText(
        language,
        slide.button_label_en,
        slide.button_label_ar,
        slide.button_label,
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
