import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;
type MovementRow = Tables<"store_inventory_movements">;

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

function firstImageByProduct(images: ImageRow[]) {
  const byProduct = new Map<string, ImageRow>();
  for (const image of [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )) {
    if (!byProduct.has(image.product_id)) byProduct.set(image.product_id, image);
  }
  return byProduct;
}

export async function loadInventoryWorkspace(): Promise<InventoryRow[]> {
  await requireDashboardStaff();

  const [productResult, variantResult, imageResult, brandResult, categoryResult, movementResult] =
    await Promise.all([
      supabase
        .from("store_products")
        .select("*")
        .order("title", { ascending: true }),
      supabase
        .from("store_product_variants")
        .select("*")
        .order("product_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("store_product_images")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("cms_brands").select("id,name"),
      supabase.from("store_categories").select("id,name"),
      supabase
        .from("store_inventory_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

  throwIfError(productResult.error, "Loading inventory products failed");
  throwIfError(variantResult.error, "Loading inventory variants failed");
  throwIfError(imageResult.error, "Loading inventory images failed");
  throwIfError(brandResult.error, "Loading inventory brands failed");
  throwIfError(categoryResult.error, "Loading inventory categories failed");
  throwIfError(movementResult.error, "Loading inventory movements failed");

  const products = new Map(
    ((productResult.data ?? []) as ProductRow[]).map((product) => [product.id, product]),
  );
  const brands = new Map((brandResult.data ?? []).map((brand) => [brand.id, brand.name]));
  const categories = new Map(
    (categoryResult.data ?? []).map((category) => [category.id, category.name]),
  );
  const productImages = firstImageByProduct((imageResult.data ?? []) as ImageRow[]);
  const latestMovementByVariant = new Map<string, MovementRow>();
  for (const movement of (movementResult.data ?? []) as MovementRow[]) {
    if (movement.variant_id && !latestMovementByVariant.has(movement.variant_id)) {
      latestMovementByVariant.set(movement.variant_id, movement);
    }
  }

  return ((variantResult.data ?? []) as VariantRow[])
    .map((variant): InventoryRow | null => {
      const product = products.get(variant.product_id);
      if (!product) return null;
      const movement = latestMovementByVariant.get(variant.id);
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
        lastMovementAt: movement?.created_at ?? null,
        lastMovementDelta: movement?.quantity_delta ?? null,
      };
    })
    .filter((row): row is InventoryRow => Boolean(row));
}

export async function listDashboardInventoryMovements(input: {
  productId: string;
  variantId: string;
  movementType?: InventoryMovementType;
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

  const { data, error } = await supabase.rpc("adjust_store_inventory", {
    p_product_id: row.productId,
    p_variant_id: row.variantId,
    p_quantity_delta: delta,
    p_note: note,
  });
  throwIfError(error, "Adjusting inventory failed");
  const result = data?.[0];
  if (!result) throw new Error("Inventory adjustment returned no result.");
  invalidateNativeStoreCache();
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

  const { data, error } = await supabase.rpc("set_store_inventory_stock", {
    p_product_id: row.productId,
    p_variant_id: row.variantId,
    p_stock: stock,
    p_note: note,
  });
  throwIfError(error, "Setting inventory failed");
  const result = data?.[0];
  if (!result) throw new Error("Inventory update returned no result.");
  invalidateNativeStoreCache();
  return result.new_stock;
}
