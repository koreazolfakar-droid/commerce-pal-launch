import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CmsJsonValue = string | number | boolean | null | CmsJsonValue[] | { [key: string]: CmsJsonValue };

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

async function loadCmsSnapshot(): Promise<CmsSnapshot> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return EMPTY_CMS;

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  try {
    const [settings, heroSlides, sections, navigation] = await Promise.all([
      client.from("cms_settings").select("key, value"),
      client
        .from("cms_hero_slides")
        .select(
          "id, title, subtitle, image_url, mobile_image_url, button_label, target_type, target_value, sort_order",
        )
        .order("sort_order", { ascending: true }),
      client
        .from("cms_sections")
        .select(
          "id, page_slug, section_key, section_type, title, subtitle, content, sort_order, is_visible",
        )
        .order("sort_order", { ascending: true }),
      client
        .from("cms_navigation")
        .select("id, area, label, icon_type, icon_value, href, sort_order, is_visible")
        .order("sort_order", { ascending: true }),
    ]);

    const settingsRecord: Record<string, CmsSettingValue> = {};
    for (const row of settings.data ?? []) {
      settingsRecord[row.key] = row.value as CmsSettingValue;
    }

    return {
      settings: settingsRecord,
      heroSlides: (heroSlides.data ?? []) as unknown as CmsHeroSlide[],
      sections: (sections.data ?? []) as unknown as CmsSection[],
      navigation: (navigation.data ?? []) as unknown as CmsNavigationItem[],
    } satisfies CmsSnapshot;
  } catch (error) {
    console.warn("Space Call dashboard content is unavailable; using storefront defaults", error);
    return EMPTY_CMS;
  }
}

/**
 * Public storefront snapshot. Reads the dashboard tables with the publishable
 * key, so only rows the anon read policies expose (visible content) are served.
 *
 * A short server-side cache keeps the dashboard from adding four Supabase reads
 * to every storefront navigation. Concurrent cold requests share one in-flight
 * fetch instead of creating a request stampede.
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
