import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";
import {
  convertProductImageToWebp,
  getProductImageResolution,
  type ProductImageConversionResult,
} from "@/dashboard/lib/imageProcessing";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

type VariantRow = Tables<"store_product_variants">;

export type DashboardVariantOptionValue = string | number | boolean;

export type DashboardProductVariant = {
  id: string;
  productId: string;
  title: string;
  sku: string;
  barcode: string;
  price: number;
  compareAt: number | null;
  stock: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  options: Record<string, DashboardVariantOptionValue>;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardProductVariantInput = Omit<
  DashboardProductVariant,
  "id" | "productId" | "createdAt" | "updatedAt"
>;

export type VariantImageUploadResult = {
  url: string;
  conversion: ProductImageConversionResult;
};

const VARIANT_BUCKET = "cms-media";
const VARIANT_PREFIX = "variants";
const MAX_STORED_BYTES = 10 * 1024 * 1024;

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function optionRecord(value: Json): Record<string, DashboardVariantOptionValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, DashboardVariantOptionValue> = {};
  for (const [key, option] of Object.entries(value)) {
    if (["string", "number", "boolean"].includes(typeof option)) {
      result[key] = option as DashboardVariantOptionValue;
    }
  }
  return result;
}

function mapVariant(row: VariantRow): DashboardProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    title: row.title,
    sku: row.sku ?? "",
    barcode: row.barcode ?? "",
    price: Number(row.price),
    compareAt: row.compare_at_price == null ? null : Number(row.compare_at_price),
    stock: row.stock_quantity,
    trackInventory: row.track_inventory,
    allowBackorder: row.allow_backorder,
    options: optionRecord(row.options),
    imageUrl: row.image_url ?? "",
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function variantRpcPayload(input: DashboardProductVariantInput) {
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("Variant price must be zero or greater.");
  }
  if (input.compareAt != null && (!Number.isFinite(input.compareAt) || input.compareAt < 0)) {
    throw new Error("Compare-at price must be zero or greater.");
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new Error("Variant stock must be a non-negative whole number.");
  }

  return {
    p_title: input.title.trim() || "Default",
    p_sku: input.sku.trim(),
    p_barcode: input.barcode.trim(),
    p_price: input.price,
    p_compare_at_price: input.compareAt,
    p_stock: input.stock,
    p_track_inventory: input.trackInventory,
    p_allow_backorder: input.allowBackorder,
    p_options: input.options as Json,
    p_image_url: input.imageUrl.trim(),
    p_sort_order: Math.max(0, Math.trunc(input.sortOrder)),
    p_is_active: input.isActive,
  };
}

export async function loadDashboardProductVariants(productId: string): Promise<{
  variants: DashboardProductVariant[];
  role: DashboardRole;
}> {
  const role = await requireDashboardStaff();
  const { data, error } = await supabase
    .from("store_product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  throwIfError(error, "Loading product variants failed");
  return { variants: ((data ?? []) as VariantRow[]).map(mapVariant), role };
}

export async function createDashboardProductVariant(
  productId: string,
  input: DashboardProductVariantInput,
): Promise<DashboardProductVariant> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("create_store_product_variant", {
    p_product_id: productId,
    ...variantRpcPayload(input),
  });
  throwIfError(error, "Creating variant failed");
  if (!data) throw new Error("Variant creation returned no row.");
  invalidateNativeStoreCache();
  return mapVariant(data as VariantRow);
}

export async function updateDashboardProductVariant(
  variantId: string,
  input: DashboardProductVariantInput,
): Promise<DashboardProductVariant> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("update_store_product_variant", {
    p_variant_id: variantId,
    ...variantRpcPayload(input),
  });
  throwIfError(error, "Updating variant failed");
  if (!data) throw new Error("Variant update returned no row.");
  invalidateNativeStoreCache();
  return mapVariant(data as VariantRow);
}

export async function reorderDashboardProductVariants(
  variants: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("reorder_store_product_variants", {
    p_items: variants.map((variant) => ({ id: variant.id, sort_order: variant.sortOrder })),
  });
  throwIfError(error, "Reordering variants failed");
  invalidateNativeStoreCache();
}

export async function deleteDashboardProductVariant(variantId: string): Promise<void> {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can permanently delete variants.");
  const { error } = await supabase.rpc("delete_store_product_variant_safe", {
    p_variant_id: variantId,
  });
  throwIfError(error, "Deleting variant failed");
  invalidateNativeStoreCache();
}

export async function uploadDashboardVariantImage(
  productId: string,
  variantId: string,
  file: File,
): Promise<VariantImageUploadResult> {
  await requireDashboardStaff();
  const conversion = await convertProductImageToWebp(file, getProductImageResolution());
  if (conversion.file.size > MAX_STORED_BYTES) {
    throw new Error("Optimized variant image must be 10 MB or smaller.");
  }

  const objectPath = `${VARIANT_PREFIX}/${productId}/${variantId}.webp`;
  const { error: uploadError } = await supabase.storage.from(VARIANT_BUCKET).upload(
    objectPath,
    conversion.file,
    {
      upsert: true,
      cacheControl: "3600",
      contentType: "image/webp",
    },
  );
  throwIfError(uploadError, "Uploading variant image failed");

  const { error: registerError } = await supabase.rpc("register_cms_media_asset", {
    p_object_path: objectPath,
    p_file_name: conversion.file.name,
    p_mime_type: "image/webp",
    p_size_bytes: conversion.file.size,
    p_alt_text: null,
  });
  throwIfError(registerError, "Registering variant image failed");

  const { data: publicUrl } = supabase.storage.from(VARIANT_BUCKET).getPublicUrl(objectPath);
  const url = `${publicUrl.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabase
    .from("store_product_variants")
    .update({ image_url: url })
    .eq("id", variantId)
    .eq("product_id", productId);
  throwIfError(updateError, "Linking variant image failed");
  invalidateNativeStoreCache();
  return { url, conversion };
}

export async function clearDashboardVariantImage(
  productId: string,
  variantId: string,
): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase
    .from("store_product_variants")
    .update({ image_url: null })
    .eq("id", variantId)
    .eq("product_id", productId);
  throwIfError(error, "Clearing variant image failed");
  invalidateNativeStoreCache();
}

export async function loadDashboardProductCollectionIds(productId: string): Promise<string[]> {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("store_collection_products")
    .select("collection_id")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  throwIfError(error, "Loading product collections failed");
  return (data ?? []).map((row) => row.collection_id);
}

export async function setDashboardProductCollections(
  productId: string,
  collectionIds: string[],
): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("set_store_product_collections", {
    p_product_id: productId,
    p_collection_ids: [...new Set(collectionIds)],
  });
  throwIfError(error, "Saving product collections failed");
  invalidateNativeStoreCache();
}

export async function setDashboardProductsStatus(
  productIds: string[],
  status: "Active" | "Draft" | "Archived",
): Promise<number> {
  await requireDashboardStaff();
  const dbStatus = status.toLowerCase();
  const { data, error } = await supabase.rpc("set_store_products_status", {
    p_product_ids: [...new Set(productIds)],
    p_status: dbStatus,
  });
  throwIfError(error, "Updating product status failed");
  invalidateNativeStoreCache();
  return Number(data ?? 0);
}

export async function duplicateDashboardProduct(productId: string): Promise<string> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("duplicate_store_product", {
    p_product_id: productId,
  });
  throwIfError(error, "Duplicating product failed");
  if (!data) throw new Error("Product duplication returned no id.");
  invalidateNativeStoreCache();
  return String(data);
}

export async function deleteDashboardProductSafe(productId: string): Promise<void> {
  const role = await requireDashboardStaff();
  if (role !== "admin") throw new Error("Only dashboard admins can permanently delete products.");
  const { error } = await supabase.rpc("delete_store_product_safe", {
    p_product_id: productId,
  });
  throwIfError(error, "Deleting product failed");
  invalidateNativeStoreCache();
}

export async function getProductManagementRole(): Promise<DashboardRole> {
  return requireDashboardStaff();
}
