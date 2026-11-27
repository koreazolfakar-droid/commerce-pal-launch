import { supabase } from "@/integrations/supabase/client";
import { getDashboardRole, searchDashboardProducts } from "./catalog";

export type WorkspaceSearchResult = {
  key: string;
  title: string;
  detail: string;
  href: string;
  group: "Products" | "Orders" | "Customers";
};

/** Bounded staff-only searches. Never loads the complete catalog or CRM. */
export async function searchDashboardWorkspace(query: string) {
  const normalizedQuery = query.trim().slice(0, 120);
  if (normalizedQuery.length < 2)
    return { items: [] as WorkspaceSearchResult[], failed: [] as string[] };
  if (!(await getDashboardRole())) throw new Error("Dashboard authentication is required.");
  const safe = normalizedQuery.replace(/[%_,()"\\]/g, " ").trim();
  if (!safe) return { items: [] as WorkspaceSearchResult[], failed: [] as string[] };
  const groups = ["Products", "Orders", "Customers"] as const;
  const results = await Promise.allSettled([
    searchDashboardProducts(normalizedQuery, 5).then((rows) =>
      rows.map((row) => ({
        key: `product-${row.id}`,
        title: row.name,
        detail: [row.brand, row.sku].filter(Boolean).join(" · "),
        href: `/dashboard/products/${encodeURIComponent(row.id)}`,
        group: "Products" as const,
      })),
    ),
    supabase
      .from("store_orders")
      .select("id,public_order_number,customer_name,status")
      .or(
        `public_order_number.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`,
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((row) => ({
          key: `order-${row.id}`,
          title: `#${row.public_order_number}`,
          detail: row.customer_name || "",
          href: `/dashboard/orders/${encodeURIComponent(row.id)}`,
          group: "Orders" as const,
        }));
      }),
    supabase
      .from("store_customers")
      .select("id,name,city")
      .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`)
      .order("name")
      .limit(5)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((row) => ({
          key: `customer-${row.id}`,
          title: row.name,
          detail: row.city || "",
          href: `/dashboard/customers/${encodeURIComponent(row.id)}`,
          group: "Customers" as const,
        }));
      }),
  ]);
  return {
    items: results.flatMap<WorkspaceSearchResult>((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
    failed: results.flatMap((result, index) =>
      result.status === "rejected" ? [groups[index]] : [],
    ),
  };
}
