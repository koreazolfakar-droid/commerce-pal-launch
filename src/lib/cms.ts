import { createServerFn } from "@tanstack/react-start";

export type CmsJsonValue =
  | string
  | number
  | boolean
  | null
  | CmsJsonValue[]
  | { [key: string]: CmsJsonValue };

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

type CmsSettingRow = {
  key: string;
  value_text: string | null;
  value_json: CmsSettingValue;
  value_type: "text" | "number" | "boolean" | "json" | "image" | "icon" | "url";
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

function parseSetting(row: CmsSettingRow): CmsSettingValue {
  if (row.value_type === "json") return row.value_json;
  if (row.value_type === "boolean") return row.value_text === "true";
  if (row.value_type === "number") {
    const parsed = Number(row.value_text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return row.value_text;
}

const cmsSnapshotFn = createServerFn({ method: "GET" }).handler(async () => {
  const baseUrl = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
  const apiKey = process.env["SUPABASE_ANON_KEY"];
  if (!baseUrl || !apiKey) return EMPTY_CMS;

  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  const read = async <T>(resource: string): Promise<T> => {
    const response = await fetch(`${baseUrl}/rest/v1/${resource}`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`CMS request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  };

  try {
    const [settingRows, heroSlides, sections, navigation] = await Promise.all([
      read<CmsSettingRow[]>(
        "cms_site_settings?select=key,value_text,value_json,value_type&order=key.asc",
      ),
      read<CmsHeroSlide[]>(
        "cms_hero_slides?select=id,title,subtitle,image_url,mobile_image_url,button_label,target_type,target_value,sort_order&order=sort_order.asc",
      ),
      read<CmsSection[]>(
        "cms_sections?select=id,page_slug,section_key,section_type,title,subtitle,content,sort_order,is_visible&order=sort_order.asc",
      ),
      read<CmsNavigationItem[]>(
        "cms_navigation_items?select=id,area,label,icon_type,icon_value,href,sort_order,is_visible&order=area.asc,sort_order.asc",
      ),
    ]);

    return {
      settings: Object.fromEntries(settingRows.map((row) => [row.key, parseSetting(row)])),
      heroSlides,
      sections,
      navigation,
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
