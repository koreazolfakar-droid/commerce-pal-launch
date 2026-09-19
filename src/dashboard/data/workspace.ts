import { supabase } from "@/integrations/supabase/client";
import { getDashboardRole } from "@/dashboard/data/catalog";

export const WORKSPACE_PAGE_SIZE = 25;
export type WorkspaceRow = {
  id: string;
  label: string;
  detail: string;
  date: string;
  href?: string;
};
export type WorkspaceSource = "catalog" | "cms" | "users" | "promotions";

export async function loadWorkspaceRows(
  source: WorkspaceSource,
  page: number,
): Promise<{ rows: WorkspaceRow[]; hasMore: boolean }> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  if (source === "users" && role !== "admin")
    throw new Error("Only administrators can view the staff directory.");
  const offset = Math.max(0, Math.floor(page)) * WORKSPACE_PAGE_SIZE;
  // One extra row establishes whether a next page exists without a full-table count.
  if (source === "users") {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id,role,mfa_required,mfa_enrolled_at,created_at")
      .order("created_at", { ascending: false })
      .order("user_id")
      .range(offset, offset + WORKSPACE_PAGE_SIZE);
    if (error) throw error;
    return {
      hasMore: (data?.length ?? 0) > WORKSPACE_PAGE_SIZE,
      rows: (data ?? []).slice(0, WORKSPACE_PAGE_SIZE).map((row) => ({
        id: row.user_id,
        label: row.user_id,
        detail: `${row.role} · MFA ${row.mfa_enrolled_at ? "enrolled" : "not enrolled"}`,
        date: row.created_at,
      })),
    };
  }
  if (source === "promotions") {
    const { data, error } = await supabase
      .from("store_product_variants")
      .select(
        "id,product_id,title,price,compare_at_price,updated_at,store_products!inner(title,status,currency)",
      )
      .eq("is_active", true)
      .eq("store_products.status", "active")
      .not("compare_at_price", "is", null)
      .order("updated_at", { ascending: false })
      .order("id")
      .range(offset, offset + WORKSPACE_PAGE_SIZE);
    if (error) throw error;
    return {
      hasMore: (data?.length ?? 0) > WORKSPACE_PAGE_SIZE,
      rows: (data ?? []).slice(0, WORKSPACE_PAGE_SIZE).map((row) => ({
        id: row.id,
        label: `${row.store_products.title} · ${row.title}`,
        detail: `${row.store_products.currency} ${row.price} / Compare at ${row.compare_at_price}${Number(row.compare_at_price) > Number(row.price) ? "" : " · No active discount"}`,
        date: row.updated_at,
        href: `/dashboard/products/${row.product_id}`,
      })),
    };
  }
  if (source === "cms") {
    const { data, error } = await supabase
      .from("cms_audit_log")
      .select("id,action,entity_type,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + WORKSPACE_PAGE_SIZE);
    if (error) throw error;
    return {
      hasMore: (data?.length ?? 0) > WORKSPACE_PAGE_SIZE,
      rows: (data ?? []).slice(0, WORKSPACE_PAGE_SIZE).map((row) => ({
        id: row.id,
        label: row.action,
        detail: row.entity_type,
        date: row.created_at,
      })),
    };
  }
  const { data, error } = await supabase
    .from("store_catalog_audit_log")
    .select("id,action,entity_type,product_id,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + WORKSPACE_PAGE_SIZE);
  if (error) throw error;
  return {
    hasMore: (data?.length ?? 0) > WORKSPACE_PAGE_SIZE,
    rows: (data ?? []).slice(0, WORKSPACE_PAGE_SIZE).map((row) => ({
      id: String(row.id),
      label: row.action,
      detail: row.entity_type,
      date: row.created_at,
    })),
  };
}
