import { supabase } from "@/integrations/supabase/client";
import { getDashboardRole } from "@/dashboard/data/catalog";
import type { HomepageSection } from "@/dashboard/data/homepageSections";

export type PreviewProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function manualIds(section: HomepageSection) {
  const configured = Array.isArray(section.settings.manualProductIds)
    ? section.settings.manualProductIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => uuid.test(id))
    : [];

  if (configured.length) return [...new Set(configured)];

  return String(section.settings.sourceValue ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => uuid.test(id));
}

export function previewSource(section: HomepageSection) {
  const source =
    section.type === "collection" || section.type === "collection-grid"
      ? "collection"
      : String(
          section.settings.source ??
            (section.sectionId === "featured_products" ? "best_sellers" : "collection"),
        );
  const value = String(
    source === "collection"
      ? (section.settings.collection ?? section.settings.sourceValue ?? "")
      : source === "manual"
        ? manualIds(section).join(",")
        : (section.settings.sourceValue ?? ""),
  ).trim();
  const count =
    source === "manual" ? manualIds(section).length || 1 : Number(section.settings.count ?? 5);
  return {
    source,
    value,
    limit: Number.isFinite(count) ? Math.min(10, Math.max(1, Math.floor(count))) : 5,
  };
}

export async function loadHomepagePreviewProducts(
  section: HomepageSection,
): Promise<PreviewProduct[]> {
  if (!(await getDashboardRole())) throw new Error("Dashboard authentication is required.");

  const { source, value, limit } = previewSource(section);
  if (!value && source !== "best_sellers" && source !== "newest") return [];

  let requestedOrder: string[] = [];
  let query = supabase
    .from("store_products")
    .select(
      "id,title,base_price,currency,store_product_images(url,is_primary,sort_order),store_product_variants(price,is_active,sort_order)",
    )
    .eq("status", "active");

  if (source === "best_sellers") {
    query = query.eq("best_seller", true).order("sort_order", { ascending: true });
  } else if (source === "newest") {
    query = query.order("created_at", { ascending: false }).order("sort_order", { ascending: true });
  } else if (source === "brand" || source === "category") {
    const result =
      source === "brand"
        ? await supabase.from("cms_brands").select("id,name,slug").eq("is_visible", true)
        : await supabase.from("store_categories").select("id,name,slug").eq("is_active", true);
    if (result.error) throw result.error;
    const match = result.data?.find((row) =>
      [row.id, row.name, row.slug].some((v) => v.toLowerCase() === value.toLowerCase()),
    );
    if (!match) return [];
    query = query.eq(source === "brand" ? "brand_id" : "category_id", match.id);
  } else if (source === "collection") {
    const { data, error } = await supabase
      .from("store_collections")
      .select("id,title,handle")
      .eq("is_active", true);
    if (error) throw error;
    const collection = data?.find((row) =>
      [row.id, row.title, row.handle].some((v) => v.toLowerCase() === value.toLowerCase()),
    );
    if (!collection) return [];
    const members = await supabase
      .from("store_collection_products")
      .select("product_id")
      .eq("collection_id", collection.id)
      .order("sort_order")
      .order("product_id")
      .limit(limit);
    if (members.error) throw members.error;
    if (!members.data?.length) return [];
    requestedOrder = members.data.map((row) => row.product_id);
    query = query.in("id", requestedOrder);
  } else if (source === "manual") {
    requestedOrder = value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => uuid.test(id))
      .slice(0, limit);
    if (!requestedOrder.length) return [];
    query = query.in("id", requestedOrder);
  } else {
    return [];
  }

  if (source !== "best_sellers" && source !== "newest") {
    query = query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const order = new Map(requestedOrder.map((id, index) => [id, index]));
  const rows = requestedOrder.length
    ? [...(data ?? [])].sort(
        (a, b) =>
          (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      )
    : (data ?? []);

  return rows.map((row) => ({
    id: row.id,
    name: row.title,
    currency: row.currency,
    price: Number(
      row.store_product_variants
        .filter((variant) => variant.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.price ?? row.base_price,
    ),
    image:
      [...row.store_product_images].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
      )[0]?.url ?? "",
  }));
}
