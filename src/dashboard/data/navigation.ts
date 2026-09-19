import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";

type NavigationRow = Tables<"cms_navigation_items">;

export type NavigationArea = "header" | "bottom" | "footer" | "mobile_menu" | "trust";
export type NavigationIconType = "lucide" | "image" | "svg" | "none";

export type DashboardNavigationItem = {
  id: string;
  area: NavigationArea;
  label: string;
  labelEn: string;
  labelAr: string;
  iconType: NavigationIconType;
  iconValue: string;
  href: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardNavigationInput = Omit<
  DashboardNavigationItem,
  "id" | "createdAt" | "updatedAt"
>;

const AREAS = new Set<NavigationArea>(["header", "bottom", "footer", "mobile_menu", "trust"]);
const ICON_TYPES = new Set<NavigationIconType>(["lucide", "image", "svg", "none"]);

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function mapNavigation(row: NavigationRow): DashboardNavigationItem {
  return {
    id: row.id,
    area: row.area as NavigationArea,
    label: row.label,
    labelEn: row.label_en ?? row.label,
    labelAr: row.label_ar ?? "",
    iconType: row.icon_type as NavigationIconType,
    iconValue: row.icon_value ?? "",
    href: row.href ?? "",
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeHref(value: string) {
  const href = value.trim();
  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    throw new Error("Navigation URL must be a site path, #anchor, or a valid http(s) URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Navigation URL must use http:// or https://.");
  }
  return parsed.toString();
}

function normalizeInput(input: DashboardNavigationInput) {
  const label = input.label.trim();
  const labelEn = input.labelEn.trim() || label;
  const labelAr = input.labelAr.trim();

  if (!label) throw new Error("Navigation label is required.");
  if (!AREAS.has(input.area)) throw new Error("Invalid navigation area.");
  if (!ICON_TYPES.has(input.iconType)) throw new Error("Invalid navigation icon type.");

  return {
    area: input.area,
    label,
    label_en: labelEn || null,
    label_ar: labelAr || null,
    icon_type: input.iconType,
    icon_value: input.iconType === "none" ? null : input.iconValue.trim() || null,
    href: normalizeHref(input.href) || null,
    sort_order: Math.max(0, Math.min(10000, Math.round(input.sortOrder || 0))),
    is_visible: input.isVisible,
    updated_at: new Date().toISOString(),
  };
}

export async function loadDashboardNavigationWorkspace(): Promise<{
  items: DashboardNavigationItem[];
  role: DashboardRole;
}> {
  const role = await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_navigation_items")
    .select("*")
    .order("area", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  throwIfError(error, "Loading navigation failed");
  return { items: ((data ?? []) as NavigationRow[]).map(mapNavigation), role };
}

export async function createDashboardNavigationItem(
  input: DashboardNavigationInput,
): Promise<DashboardNavigationItem> {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_navigation_items")
    .insert(normalizeInput(input))
    .select("*")
    .single();

  throwIfError(error, "Creating navigation item failed");
  return mapNavigation(data as NavigationRow);
}

export async function updateDashboardNavigationItem(
  id: string,
  input: DashboardNavigationInput,
): Promise<DashboardNavigationItem> {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("cms_navigation_items")
    .update(normalizeInput(input))
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "Updating navigation item failed");
  return mapNavigation(data as NavigationRow);
}

export async function deleteDashboardNavigationItem(id: string): Promise<void> {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can delete navigation items.");

  const { error } = await supabase.from("cms_navigation_items").delete().eq("id", id);
  throwIfError(error, "Deleting navigation item failed");
}
