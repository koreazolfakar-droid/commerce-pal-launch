import { rpcArgs } from "@/dashboard/lib/rpcArgs";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";
import { broadcastStorefrontRefresh, invalidateNativeStoreCache } from "@/lib/nativeStore";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;
type MovementRow = Tables<"store_inventory_movements">;

type InventoryProductRow = Pick<
  ProductRow,
  | "id"
  | "title"
  | "brand_id"
  | "category_id"
  | "product_type"
  | "sku"
  | "barcode"
  | "stock_quantity"
  | "status"
>;
type InventoryVariantRow = Pick<
  VariantRow,
  | "id"
  | "product_id"
  | "title"
  | "sku"
  | "barcode"
  | "image_url"
  | "stock_quantity"
  | "track_inventory"
  | "is_active"
  | "options"
>;
type InventoryImageRow = Pick<ImageRow, "product_id" | "url" | "is_primary" | "sort_order">;
type InventoryLatestMovementRow = Pick<
  MovementRow,
  "variant_id" | "created_at" | "quantity_delta"
>;

export type InventoryRow = {
  productId: string;
  variantId: string;
  productName: string;
  variantTitle: string;
  brand: string;
  categoryId: string | null;
  category: string;
  sku: string;
  barcode: string;
  image: string;
  stock: number;
  productStock: number;
  trackInventory: boolean;
  variantActive: boolean;
  productStatus: ProductRow["status"];
  optionsLabel: string;
  lastMovementAt: string | null;
  lastMovementDelta: number | null;
};

export const INVENTORY_MOVEMENT_TYPES = [
  "purchase",
  "sale",
  "return",
  "adjustment",
  "reservation",
  "release",
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const INVENTORY_REFERENCE_TYPES = [
  "manual_dashboard",
  "variant_manager",
  "order",
  "order_cancel",
  "receiving",
] as const;

export type InventoryReferenceType = (typeof INVENTORY_REFERENCE_TYPES)[number];

export function sanitizeInventoryMovementSearch(value?: string) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s#_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export type DashboardInventoryMovement = {
  id: string;
  productId: string;
  variantId: string | null;
  movementType: string;
  quantityDelta: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type DashboardInventoryMovementPage = {
  items: DashboardInventoryMovement[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type InventoryLatestMovement = {
  variantId: string;
  createdAt: string;
  quantityDelta: number;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function optionsLabel(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value)
    .filter((entry): entry is [string, string | number | boolean] =>
      ["string", "number", "boolean"].includes(typeof entry[1]),
    )
    .map(([name, option]) => `${name}: ${String(option)}`)
    .join(" · ");
}

function firstImageByProduct(images: InventoryImageRow[]) {
  const byProduct = new Map<string, InventoryImageRow>();
  for (const image of [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )) {
    if (!byProduct.has(image.product_id)) byProduct.set(image.product_id, image);
  }
  return byProduct;
}

export async function loadInventoryWorkspace(): Promise<InventoryRow[]> {
  await requireDashboardStaff();

  const [productResult, variantResult, imageResult, brandResult, categoryResult] = await Promise.all([
    supabase
      .from("store_products")
      .select("id,title,brand_id,category_id,product_type,sku,barcode,stock_quantity,status")
      .order("title", { ascending: true }),
    supabase
      .from("store_product_variants")
      .select(
        "id,product_id,title,sku,barcode,image_url,stock_quantity,track_inventory,is_active,options",
      )
      .order("product_id", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("store_product_images")
      .select("product_id,url,is_primary,sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("cms_brands").select("id,name"),
    supabase.from("store_categories").select("id,name"),
  ]);

  throwIfError(productResult.error, "Loading inventory products failed");
  throwIfError(variantResult.error, "Loading inventory variants failed");
  throwIfError(imageResult.error, "Loading inventory images failed");
  throwIfError(brandResult.error, "Loading inventory brands failed");
  throwIfError(categoryResult.error, "Loading inventory categories failed");

  const products = new Map(
    ((productResult.data ?? []) as InventoryProductRow[]).map((product) => [product.id, product]),
  );
  const brands = new Map((brandResult.data ?? []).map((brand) => [brand.id, brand.name]));
  const categories = new Map(
    (categoryResult.data ?? []).map((category) => [category.id, category.name]),
  );
  const productImages = firstImageByProduct((imageResult.data ?? []) as InventoryImageRow[]);

  return ((variantResult.data ?? []) as InventoryVariantRow[])
    .map((variant): InventoryRow | null => {
      const product = products.get(variant.product_id);
      if (!product) return null;
      const fallbackImage = productImages.get(product.id)?.url ?? "";
      return {
        productId: product.id,
        variantId: variant.id,
        productName: product.title,
        variantTitle: variant.title,
        brand: product.brand_id ? brands.get(product.brand_id) ?? "" : "",
        categoryId: product.category_id,
        category: product.category_id
          ? categories.get(product.category_id) ?? product.product_type ?? ""
          : product.product_type ?? "",
        sku: variant.sku ?? product.sku ?? "",
        barcode: variant.barcode ?? product.barcode ?? "",
        image: variant.image_url || fallbackImage,
        stock: variant.stock_quantity,
        productStock: product.stock_quantity,
        trackInventory: variant.track_inventory,
        variantActive: variant.is_active,
        productStatus: product.status,
        optionsLabel: optionsLabel(variant.options),
        lastMovementAt: null,
        lastMovementDelta: null,
      };
    })
    .filter((row): row is InventoryRow => Boolean(row));
}

export type InventoryPage = {
  items: InventoryRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type InventorySummary = {
  totalUnits: number;
  variantCount: number;
  lowCount: number;
  outCount: number;
};

export type InventoryCategoryOption = {
  id: string;
  name: string;
};

export type InventoryCategoryOptions = {
  items: InventoryCategoryOption[];
  hasUncategorized: boolean;
};

type InventoryPageRow = {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_title: string | null;
  brand: string | null;
  category_id: string | null;
  category: string | null;
  sku: string | null;
  barcode: string | null;
  image: string | null;
  stock: number;
  product_stock: number;
  track_inventory: boolean;
  variant_active: boolean;
  product_status: string;
  options: Json;
  total_count: number;
};

type InventorySummaryRow = {
  total_units: number | null;
  variant_count: number | null;
  low_count: number | null;
  out_count: number | null;
};

export async function loadInventoryPage(input: {
  search?: string;
  category?: string;
  threshold?: number;
  onlyLow?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<InventoryPage> {
  await requireDashboardStaff();

  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize ?? 20)));
  const category = input.category ?? "all";
  const categoryId =
    category !== "all" && category !== "uncategorized" ? category : undefined;

  // The generated Supabase types lag behind the dashboard pagination functions,
  // so these two RPCs are called through a loosely typed view of the client and
  // narrowed to the row shapes the SQL functions return.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: InventoryPageRow[] | null; error: unknown }>;

  const { data, error } = await rpc("dashboard_inventory_page", {
    p_search: input.search?.trim() || undefined,
    p_category_id: categoryId,
    p_uncategorized: category === "uncategorized",
    p_only_low: Boolean(input.onlyLow),
    p_threshold: Math.max(0, Math.trunc(input.threshold ?? 10)),
    p_page: page,
    p_page_size: pageSize,
  });

  throwIfError(error as never, "Loading inventory page failed");

  const rows = data ?? [];
  return {
    items: rows.map((row) => ({
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      variantTitle: row.variant_title ?? "",
      brand: row.brand ?? "",
      categoryId: row.category_id,
      category: row.category ?? "",
      sku: row.sku ?? "",
      barcode: row.barcode ?? "",
      image: row.image ?? "",
      stock: row.stock,
      productStock: row.product_stock,
      trackInventory: row.track_inventory,
      variantActive: row.variant_active,
      productStatus: row.product_status as ProductRow["status"],
      optionsLabel: optionsLabel(row.options),
      lastMovementAt: null,
      lastMovementDelta: null,
    })),
    page,
    pageSize,
    totalCount: Number(rows[0]?.total_count ?? 0),
  };
}

export async function loadInventorySummary(
  threshold = 10,
): Promise<InventorySummary> {
  await requireDashboardStaff();
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: InventorySummaryRow[] | null; error: unknown }>;

  const { data, error } = await rpc("dashboard_inventory_summary", {
    p_threshold: Math.max(0, Math.trunc(threshold)),
  });

  throwIfError(error as never, "Loading inventory summary failed");
  const summary = data?.[0];

  return {
    totalUnits: Number(summary?.total_units ?? 0),
    variantCount: Number(summary?.variant_count ?? 0),
    lowCount: Number(summary?.low_count ?? 0),
    outCount: Number(summary?.out_count ?? 0),
  };
}

export async function loadInventoryCategoryOptions(): Promise<InventoryCategoryOptions> {
  await requireDashboardStaff();

  const [categoryResult, uncategorizedResult] = await Promise.all([
    supabase.from("store_categories").select("id,name").order("name", { ascending: true }),
    supabase.from("store_products").select("id").is("category_id", null).limit(1),
  ]);

  throwIfError(categoryResult.error, "Loading inventory categories failed");
  throwIfError(uncategorizedResult.error, "Loading uncategorized inventory state failed");

  return {
    items: (categoryResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
    })),
    hasUncategorized: Boolean(uncategorizedResult.data?.length),
  };
}

export async function loadInventoryLatestMovements(
  variantIds?: string[],
  limit = 1000,
): Promise<InventoryLatestMovement[]> {
  await requireDashboardStaff();
  const safeLimit = Math.min(2000, Math.max(1, Math.trunc(limit)));
  const ids = [...new Set((variantIds ?? []).filter(Boolean))];

  if (variantIds && ids.length === 0) return [];

  let query = supabase
    .from("store_inventory_movements")
    .select("variant_id,created_at,quantity_delta")
    .not("variant_id", "is", null);

  if (ids.length) {
    query = query.in("variant_id", ids);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  throwIfError(error, "Loading latest inventory movements failed");

  const latestByVariant = new Map<string, InventoryLatestMovement>();
  for (const movement of (data ?? []) as InventoryLatestMovementRow[]) {
    if (!movement.variant_id || latestByVariant.has(movement.variant_id)) continue;
    latestByVariant.set(movement.variant_id, {
      variantId: movement.variant_id,
      createdAt: movement.created_at,
      quantityDelta: movement.quantity_delta,
    });
  }

  return [...latestByVariant.values()];
}

export async function listDashboardInventoryMovements(input: {
  productId: string;
  variantId: string;
  movementType?: InventoryMovementType;
  referenceType?: InventoryReferenceType;
  search?: string;
  createdSince?: string;
  page?: number;
  pageSize?: number;
}): Promise<DashboardInventoryMovementPage> {
  await requireDashboardStaff();

  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.trunc(input.pageSize ?? 25)));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  let query = supabase
    .from("store_inventory_movements")
    .select(
      "id,product_id,variant_id,movement_type,quantity_delta,reference_type,reference_id,note,created_by,created_at",
    )
    .eq("product_id", input.productId)
    .eq("variant_id", input.variantId);

  if (input.movementType) {
    query = query.eq("movement_type", input.movementType);
  }

  if (input.referenceType) {
    query = query.eq("reference_type", input.referenceType);
  }

  const search = sanitizeInventoryMovementSearch(input.search);
  if (search) {
    query = query.or(`reference_id.ilike.%${search}%,note.ilike.%${search}%`);
  }

  if (input.createdSince) {
    query = query.gte("created_at", input.createdSince);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, end);

  throwIfError(error, "Loading inventory movement history failed");

  const rows = (data ?? []) as Pick<
    MovementRow,
    | "id"
    | "product_id"
    | "variant_id"
    | "movement_type"
    | "quantity_delta"
    | "reference_type"
    | "reference_id"
    | "note"
    | "created_by"
    | "created_at"
  >[];
  const hasMore = rows.length > pageSize;

  return {
    items: rows.slice(0, pageSize).map((row) => ({
      id: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      movementType: row.movement_type,
      quantityDelta: row.quantity_delta,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      note: row.note,
      createdBy: row.created_by,
      createdAt: row.created_at,
    })),
    page,
    pageSize,
    hasMore,
  };
}

export async function adjustInventoryDelta(
  row: InventoryRow,
  delta: number,
  note = "Inventory dashboard adjustment",
) {
  await requireDashboardStaff();
  if (!Number.isInteger(delta) || delta === 0) return row.stock;

  const { data, error } = await supabase.rpc("adjust_store_inventory", rpcArgs({
    p_product_id: row.productId,
    p_variant_id: row.variantId,
    p_quantity_delta: delta,
    p_note: note,
  }));
  throwIfError(error, "Adjusting inventory failed");
  const result = data?.[0];
  if (!result) throw new Error("Inventory adjustment returned no result.");
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
  return result.new_stock;
}

export async function setInventoryStock(
  row: InventoryRow,
  stock: number,
  note = "Inventory dashboard stock set",
) {
  await requireDashboardStaff();
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be a non-negative whole number.");
  }

  const { data, error } = await supabase.rpc("set_store_inventory_stock", rpcArgs({
    p_product_id: row.productId,
    p_variant_id: row.variantId,
    p_stock: stock,
    p_note: note,
  }));
  throwIfError(error, "Setting inventory failed");
  const result = data?.[0];
  if (!result) throw new Error("Inventory update returned no result.");
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
  return result.new_stock;
}
