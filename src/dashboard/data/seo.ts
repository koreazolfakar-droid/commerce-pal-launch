import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";

type SeoRow = Tables<"cms_seo_pages">;

export type DashboardSeoPage = {
  pageSlug: string;
  title: string;
  titleEn: string;
  titleAr: string;
  description: string;
  descriptionEn: string;
  descriptionAr: string;
  ogImageUrl: string;
  canonicalUrl: string;
  robots: string;
  jsonLd: Record<string, unknown>;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSeoInput = Omit<DashboardSeoPage, "createdAt" | "updatedAt">;

const PAGE_SLUG = /^[a-z0-9][a-z0-9_/-]{0,119}$/;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapSeo(row: SeoRow): DashboardSeoPage {
  return {
    pageSlug: row.page_slug,
    title: row.title ?? "",
    titleEn: row.title_en ?? row.title ?? "",
    titleAr: row.title_ar ?? "",
    description: row.description ?? "",
    descriptionEn: row.description_en ?? row.description ?? "",
    descriptionAr: row.description_ar ?? "",
    ogImageUrl: row.og_image_url ?? "",
    canonicalUrl: row.canonical_url ?? "",
    robots: row.robots,
    jsonLd: isRecord(row.json_ld) ? row.json_ld : {},
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function optionalUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http:// or https://.`);
  }
  return parsed.toString();
}

function normalize(input: DashboardSeoInput) {
  const pageSlug = input.pageSlug.trim().replace(/^\/+|\/+$/g, "");
  if (!PAGE_SLUG.test(pageSlug)) {
    throw new Error("Page slug must use lowercase letters, numbers, slash, hyphen or underscore.");
  }

  if (!isRecord(input.jsonLd)) throw new Error("JSON-LD must be a JSON object.");

  return {
    page_slug: pageSlug,
    title: input.titleEn.trim() || input.title.trim() || null,
    title_en: input.titleEn.trim() || null,
    title_ar: input.titleAr.trim() || null,
    description: input.descriptionEn.trim() || input.description.trim() || null,
    description_en: input.descriptionEn.trim() || null,
    description_ar: input.descriptionAr.trim() || null,
    og_image_url: optionalUrl(input.ogImageUrl, "Open Graph image"),
    canonical_url: optionalUrl(input.canonicalUrl, "Canonical URL"),
    robots: input.robots.trim() || "index,follow",
    json_ld: input.jsonLd as Json,
    is_public: input.isPublic,
    updated_at: new Date().toISOString(),
  };
}

export async function loadDashboardSeoWorkspace(): Promise<{
  pages: DashboardSeoPage[];
  role: DashboardRole;
}> {
  const role = await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_seo_pages")
    .select("*")
    .order("page_slug", { ascending: true });

  throwIfError(error, "Loading SEO pages failed");
  return { pages: ((data ?? []) as SeoRow[]).map(mapSeo), role };
}

export async function saveDashboardSeoPage(input: DashboardSeoInput): Promise<DashboardSeoPage> {
  await requireDashboardStaff();
  const payload = normalize(input);
  const { data, error } = await supabase
    .from("cms_seo_pages")
    .upsert(payload, { onConflict: "page_slug" })
    .select("*")
    .single();

  throwIfError(error, "Saving SEO page failed");
  return mapSeo(data as SeoRow);
}

export async function deleteDashboardSeoPage(pageSlug: string): Promise<void> {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can delete SEO pages.");
  if (pageSlug === "home") throw new Error("The home SEO row is protected. Set it non-public instead.");

  const { error } = await supabase.from("cms_seo_pages").delete().eq("page_slug", pageSlug);
  throwIfError(error, "Deleting SEO page failed");
}
