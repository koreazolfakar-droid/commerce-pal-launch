import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";
import {
  sectionTypeLabels,
  type HomepageSection,
  type SectionStatus,
  type SectionType,
} from "@/dashboard/mock/homepageSections";

type CmsSectionRow = Tables<"cms_sections">;

type BuilderState = {
  type?: unknown;
  name?: unknown;
  description?: unknown;
  eyebrow?: unknown;
  buttonText?: unknown;
  buttonLink?: unknown;
  secondaryButtonText?: unknown;
  secondaryButtonLink?: unknown;
  status?: unknown;
  enabled?: unknown;
  showOnStorefront?: unknown;
  showOnDesktop?: unknown;
  showOnTablet?: unknown;
  showOnMobile?: unknown;
  background?: unknown;
  textColor?: unknown;
  alignment?: unknown;
  spacing?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  settings?: unknown;
};

const SECTION_TYPES: SectionType[] = [
  "hero",
  "text",
  "image-text",
  "banner",
  "product-carousel",
  "featured-products",
  "collection",
  "collection-grid",
  "brands",
  "categories",
  "promo",
  "trust",
  "announcement",
  "faq",
  "newsletter",
  "video",
  "countdown",
  "custom",
];

const SECTION_TYPE_SET = new Set<string>(SECTION_TYPES);

const DB_TYPE_TO_BUILDER: Record<string, SectionType> = {
  hero: "hero",
  brand_rail: "brands",
  product_rail: "featured-products",
  trust_rail: "trust",
  category_rail: "categories",
};

const BUILDER_TO_DB_TYPE: Partial<Record<SectionType, string>> = {
  hero: "hero",
  brands: "brand_rail",
  "featured-products": "product_rail",
  "product-carousel": "product_rail",
  trust: "trust_rail",
  categories: "category_rail",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readStatus(value: unknown): SectionStatus {
  return value === "draft" ? "draft" : "published";
}

function readType(value: unknown, dbType: string): SectionType {
  if (typeof value === "string" && SECTION_TYPE_SET.has(value)) return value as SectionType;
  return DB_TYPE_TO_BUILDER[dbType] ?? (SECTION_TYPE_SET.has(dbType) ? (dbType as SectionType) : "custom");
}

function readAlignment(value: unknown): HomepageSection["alignment"] {
  return value === "center" || value === "right" ? value : "left";
}

function readSpacing(value: unknown): HomepageSection["spacing"] {
  return value === "compact" || value === "spacious" ? value : "comfortable";
}

function rowBuilderState(row: CmsSectionRow): BuilderState {
  const content = isRecord(row.content) ? row.content : {};
  return isRecord(content["builder"]) ? (content["builder"] as BuilderState) : {};
}

function mapRow(row: CmsSectionRow, order: number): HomepageSection {
  const builder = rowBuilderState(row);
  const type = readType(builder.type, row.section_type);
  const defaultVisible = row.is_visible;

  return {
    id: row.id,
    type,
    name: readText(builder.name, row.title_en ?? row.title ?? sectionTypeLabels[type]),
    title: row.title_en ?? row.title ?? sectionTypeLabels[type],
    subtitle: row.subtitle_en ?? row.subtitle ?? "",
    description: readText(builder.description),
    eyebrow: readText(builder.eyebrow),
    buttonText: readText(builder.buttonText),
    buttonLink: readText(builder.buttonLink),
    secondaryButtonText: readText(builder.secondaryButtonText),
    secondaryButtonLink: readText(builder.secondaryButtonLink),
    status: readStatus(builder.status),
    enabled: readBoolean(builder.enabled, defaultVisible),
    showOnStorefront: readBoolean(builder.showOnStorefront, true),
    showOnDesktop: readBoolean(builder.showOnDesktop, true),
    showOnTablet: readBoolean(builder.showOnTablet, true),
    showOnMobile: readBoolean(builder.showOnMobile, true),
    order,
    background: readText(builder.background, "surface"),
    textColor: readText(builder.textColor, "dark"),
    alignment: readAlignment(builder.alignment),
    spacing: readSpacing(builder.spacing),
    sectionId: row.section_key,
    startDate: readText(builder.startDate),
    endDate: readText(builder.endDate),
    settings: isRecord(builder.settings) ? { ...builder.settings } : {},
  };
}

async function requireDashboardStaff(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function normalizedSectionKey(section: HomepageSection) {
  const key = section.sectionId.trim().toLowerCase();
  if (!SECTION_KEY_PATTERN.test(key)) {
    throw new Error(
      `Section ID "${section.sectionId}" must use only lowercase letters, numbers, hyphens or underscores.`,
    );
  }
  return key;
}

function validateSections(sections: HomepageSection[]) {
  if (!sections.length) throw new Error("Keep at least one homepage section.");

  const ids = new Set<string>();
  const keys = new Set<string>();

  for (const section of sections) {
    if (!UUID_PATTERN.test(section.id)) {
      throw new Error(`Homepage section "${section.name}" has an invalid internal ID.`);
    }
    if (ids.has(section.id)) throw new Error("Duplicate homepage section internal ID.");
    ids.add(section.id);

    const key = normalizedSectionKey(section);
    if (keys.has(key)) throw new Error(`Duplicate homepage Section ID: ${key}`);
    keys.add(key);
  }
}

function builderPayload(section: HomepageSection) {
  return {
    type: section.type,
    name: section.name.trim(),
    description: section.description,
    eyebrow: section.eyebrow,
    buttonText: section.buttonText,
    buttonLink: section.buttonLink,
    secondaryButtonText: section.secondaryButtonText,
    secondaryButtonLink: section.secondaryButtonLink,
    status: section.status,
    enabled: section.enabled,
    showOnStorefront: section.showOnStorefront,
    showOnDesktop: section.showOnDesktop,
    showOnTablet: section.showOnTablet,
    showOnMobile: section.showOnMobile,
    background: section.background,
    textColor: section.textColor,
    alignment: section.alignment,
    spacing: section.spacing,
    startDate: section.startDate,
    endDate: section.endDate,
    settings: section.settings,
  };
}

export async function loadDashboardHomepageWorkspace(): Promise<{
  sections: HomepageSection[];
  role: DashboardRole;
}> {
  const role = await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_sections")
    .select("*")
    .eq("page_slug", "home")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  throwIfError(error, "Loading homepage sections failed");

  const sections = ((data ?? []) as CmsSectionRow[]).map((row, index) => mapRow(row, index + 1));
  return { sections, role };
}

export async function saveDashboardHomepageSections(
  sections: HomepageSection[],
): Promise<HomepageSection[]> {
  await requireDashboardStaff();
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  validateSections(ordered);

  const ids = ordered.map((section) => section.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("cms_sections")
    .select("id,content")
    .eq("page_slug", "home")
    .in("id", ids);
  throwIfError(existingError, "Loading existing homepage content failed");

  const existingContent = new Map(
    ((existingRows ?? []) as Array<Pick<CmsSectionRow, "id" | "content">>).map((row) => [
      row.id,
      isRecord(row.content) ? row.content : {},
    ]),
  );

  const now = new Date().toISOString();
  const payloads = ordered.map((section, index) => {
    const sectionKey = normalizedSectionKey(section);
    const currentContent = existingContent.get(section.id) ?? {};
    const content = {
      ...currentContent,
      builderType: section.type,
      builder: builderPayload(section),
    } as Json;

    return {
      id: section.id,
      page_slug: "home",
      section_key: sectionKey,
      section_type: BUILDER_TO_DB_TYPE[section.type] ?? section.type,
      title: section.title.trim() || null,
      title_en: section.title.trim() || null,
      subtitle: section.subtitle.trim() || null,
      subtitle_en: section.subtitle.trim() || null,
      content,
      sort_order: (index + 1) * 10,
      is_visible:
        section.status === "published" && section.enabled && section.showOnStorefront,
      updated_at: now,
    };
  });

  const { data, error } = await supabase
    .from("cms_sections")
    .upsert(payloads, { onConflict: "id" })
    .select("*");
  throwIfError(error, "Saving homepage sections failed");

  return ((data ?? []) as CmsSectionRow[])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row, index) => mapRow(row, index + 1));
}

export async function deleteDashboardHomepageSection(id: string): Promise<void> {
  const role = await requireDashboardStaff();
  if (role !== "admin") {
    throw new Error("Only dashboard admins can permanently delete homepage sections.");
  }

  const { error } = await supabase
    .from("cms_sections")
    .delete()
    .eq("page_slug", "home")
    .eq("id", id);
  throwIfError(error, "Deleting homepage section failed");
}
