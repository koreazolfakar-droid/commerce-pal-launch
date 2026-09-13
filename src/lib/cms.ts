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

const EMPTY_CMS: CmsSnapshot = {
  settings: {},
  heroSlides: [],
  sections: [],
  navigation: [],
};

const PUBLIC_CMS_URL =
  "https://rtwyankpxtffqqrasyzw.supabase.co/functions/v1/public-cms";

const cmsSnapshotFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch(PUBLIC_CMS_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`CMS request failed (${response.status})`);

    const snapshot = (await response.json()) as Partial<CmsSnapshot>;
    return {
      settings:
        snapshot.settings && typeof snapshot.settings === "object"
          ? snapshot.settings
          : {},
      heroSlides: Array.isArray(snapshot.heroSlides) ? snapshot.heroSlides : [],
      sections: Array.isArray(snapshot.sections) ? snapshot.sections : [],
      navigation: Array.isArray(snapshot.navigation) ? snapshot.navigation : [],
    } satisfies CmsSnapshot;
  } catch (error) {
    console.warn("Space Call CMS is unavailable; using storefront defaults", error);
    return EMPTY_CMS;
  }
});

export async function fetchCmsSnapshot(): Promise<CmsSnapshot> {
  return cmsSnapshotFn();
}

export function cmsText(snapshot: CmsSnapshot, key: string) {
  const value = snapshot.settings[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
