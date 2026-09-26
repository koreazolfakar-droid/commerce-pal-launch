import { rpcArgs } from "@/dashboard/lib/rpcArgs";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { parseTemplate, type SpecTemplate } from "@/lib/specifications";
import {
  getDashboardRole,
  listDashboardProducts,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import { broadcastStorefrontRefresh, invalidateNativeStoreCache } from "@/lib/nativeStore";
import {
  convertProductImageToWebp,
  type ProductImageConversionResult,
  type ProductImageResolution,
} from "@/dashboard/lib/imageProcessing";

type CategoryRow = Tables<"store_categories">;

const CATEGORY_IMAGE_BUCKET = "cms-media";
const CATEGORY_IMAGE_PREFIX = "categories";
const MAX_CATEGORY_IMAGE_BYTES = 10 * 1024 * 1024;
const DEFAULT_CATEGORY_IMAGE_RESOLUTION: ProductImageResolution = "1080";

function categoryStoragePathFromUrl(url: string) {
  const marker = `/storage/v1/object/public/${CATEGORY_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const objectPath = decodeURIComponent(url.slice(index + marker.length));
  return objectPath.startsWith(`${CATEGORY_IMAGE_PREFIX}/`) ? objectPath : null;
}

async function removeOwnedCategoryImageFile(url?: string | null) {
  if (!url) return;
  const objectPath = categoryStoragePathFromUrl(url);
  if (!objectPath) return;
  const { error } = await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([objectPath]);
  throwIfError(error, "Deleting category image file failed");
}

function formatCategoryImagePath(categoryId: string) {
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${CATEGORY_IMAGE_PREFIX}/${categoryId}/${unique}.webp`;
}

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  active: boolean;
  order: number;
  featured: boolean;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
  updatedAt?: string;
  specTemplate?: SpecTemplate;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function mapCategory(row: CategoryRow): CatalogCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon || "LayoutGrid",
    description: row.description || "",
    active: row.is_active,
    order: row.sort_order,
    featured: row.is_featured,
    ...(row.image_url ? { image: row.image_url } : {}),
    ...(row.seo_title ? { seoTitle: row.seo_title } : {}),
    ...(row.seo_description ? { seoDescription: row.seo_description } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    specTemplate: parseTemplate(row.spec_template),
  };
}

const CATEGORY_FAMILY_ALIASES: Record<string, string> = {
  "mobile-phones": "smartphone",
  "foldable-smartphone": "smartphone",
  "smartphone-bundle": "smartphone",
  "gaming-tablet": "tablet",
  "wall-charger": "charger",
  "charging-cable": "cable",
  "used-phones": "used-phone",
};

export function normalizeCategorySlug(value: string) {
  return value
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function canonicalCategoryFamilySlug(value: string) {
  const slug = normalizeCategorySlug(value);
  return CATEGORY_FAMILY_ALIASES[slug] ?? slug;
}

export function createUniqueCategorySlug(
  value: string,
  categories: CatalogCategory[],
  excludeId?: string,
) {
  const base = normalizeCategorySlug(value) || "category";
  const used = new Set(
    categories
      .filter((category) => category.id !== excludeId)
      .map((category) => category.slug.toLowerCase()),
  );
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function productBelongsToCategory(
  product: DashboardProduct,
  category: CatalogCategory,
) {
  return product.categoryId === category.id;
}

export function getProductsForCategory(
  products: DashboardProduct[],
  category: CatalogCategory,
) {
  return products.filter((product) => productBelongsToCategory(product, category));
}

export function getCategoryProductCount(
  products: DashboardProduct[],
  category: CatalogCategory,
) {
  return getProductsForCategory(products, category).length;
}

export function countProductsAssignedToValidCategories(
  products: DashboardProduct[],
  categories: CatalogCategory[],
) {
  const valid = new Set(categories.map((category) => category.id));
  return products.filter(
    (product) => product.categoryId && valid.has(product.categoryId),
  ).length;
}

export async function loadCategoriesWorkspace() {
  await requireDashboardStaff();
  const [categoryResult, products] = await Promise.all([
    supabase
      .from("store_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    listDashboardProducts(),
  ]);
  throwIfError(categoryResult.error, "Loading categories failed");
  return {
    categories: ((categoryResult.data ?? []) as CategoryRow[]).map(mapCategory),
    products,
  };
}

export async function createDashboardCategory(category: CatalogCategory) {
  await requireDashboardStaff();
  const { data, error } = await supabase
    .from("store_categories")
    .insert({
      name: category.name.trim(),
      slug: normalizeCategorySlug(category.slug || category.name),
      description: category.description.trim() || null,
      image_url: category.image?.trim() || null,
      icon: category.icon?.trim() || null,
      sort_order: Math.max(0, Math.trunc(category.order)),
      is_active: category.active,
      is_featured: category.featured,
      seo_title: category.seoTitle?.trim() || null,
      seo_description: category.seoDescription?.trim() || null,
      spec_template: (category.specTemplate ?? { sections: [] }) as unknown as Json,
    })
    .select("*")
    .single();
  throwIfError(error, "Creating category failed");
  if (!data) throw new Error("Creating category returned no record.");
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
  return mapCategory(data as CategoryRow);
}

export async function updateDashboardCategory(category: CatalogCategory) {
  await requireDashboardStaff();

  const { data: existing, error: existingError } = await supabase
    .from("store_categories")
    .select("image_url")
    .eq("id", category.id)
    .single();
  throwIfError(existingError, "Loading category before update failed");
  const previousImageUrl = existing?.image_url ?? null;
  const nextImageUrl = category.image?.trim() || "";

  const { error } = await supabase.rpc("update_store_category", rpcArgs({
    p_category_id: category.id,
    p_name: category.name.trim(),
    p_slug: normalizeCategorySlug(category.slug || category.name),
    p_description: category.description.trim(),
    p_image_url: category.image?.trim() || "",
    p_icon: category.icon?.trim() || "",
    p_sort_order: Math.max(0, Math.trunc(category.order)),
    p_is_active: category.active,
    p_is_featured: category.featured,
    p_seo_title: category.seoTitle?.trim() || "",
    p_seo_description: category.seoDescription?.trim() || "",
  }));
  throwIfError(error, "Updating category failed");

  const { error: templateError } = await supabase.from("store_categories")
    .update({ spec_template: (category.specTemplate ?? { sections: [] }) as unknown as Json })
    .eq("id", category.id);
  throwIfError(templateError, "Updating specification template failed");

  const { data, error: readError } = await supabase
    .from("store_categories")
    .select("*")
    .eq("id", category.id)
    .single();
  throwIfError(readError, "Reloading category failed");
  if (!data) throw new Error("Updating category returned no record.");

  if (previousImageUrl && previousImageUrl !== nextImageUrl) {
    await removeOwnedCategoryImageFile(previousImageUrl).catch(() => undefined);
  }

  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
  return mapCategory(data as CategoryRow);
}

export async function uploadDashboardCategoryImage(
  category: CatalogCategory,
  source: File,
  resolution: ProductImageResolution = DEFAULT_CATEGORY_IMAGE_RESOLUTION,
): Promise<{ category: CatalogCategory; conversion: ProductImageConversionResult }> {
  await requireDashboardStaff();
  if (!category.id) throw new Error("Save the category before uploading an image.");

  // Conversion must finish before Storage upload. Original JPG/PNG/AVIF bytes
  // never reach Storage through this category image path.
  const conversion = await convertProductImageToWebp(source, resolution);
  if (conversion.file.size > MAX_CATEGORY_IMAGE_BYTES) {
    throw new Error("Converted category image must be 10 MB or smaller.");
  }

  const objectPath = formatCategoryImagePath(category.id);
  const { error: uploadError } = await supabase.storage
    .from(CATEGORY_IMAGE_BUCKET)
    .upload(objectPath, conversion.file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });
  throwIfError(uploadError, "Uploading category image failed");

  const { data: publicUrl } = supabase.storage
    .from(CATEGORY_IMAGE_BUCKET)
    .getPublicUrl(objectPath);

  try {
    const previousImageUrl = category.image;
    const { data, error } = await supabase
      .from("store_categories")
      .update({ image_url: publicUrl.publicUrl })
      .eq("id", category.id)
      .select("*")
      .single();
    throwIfError(error, "Saving category image failed");
    if (!data) throw new Error("Saving category image returned no record.");

    if (previousImageUrl && previousImageUrl !== publicUrl.publicUrl) {
      await removeOwnedCategoryImageFile(previousImageUrl).catch(() => undefined);
    }

    invalidateNativeStoreCache();
    broadcastStorefrontRefresh();
    return {
      category: mapCategory(data as CategoryRow),
      conversion,
    };
  } catch (error) {
    await supabase.storage.from(CATEGORY_IMAGE_BUCKET).remove([objectPath]).catch(() => undefined);
    throw error;
  }
}

export async function deleteDashboardCategoryImage(
  category: CatalogCategory,
): Promise<CatalogCategory> {
  await requireDashboardStaff();
  const previousImageUrl = category.image;

  const { data, error } = await supabase
    .from("store_categories")
    .update({ image_url: null })
    .eq("id", category.id)
    .select("*")
    .single();
  throwIfError(error, "Removing category image failed");
  if (!data) throw new Error("Removing category image returned no record.");

  await removeOwnedCategoryImageFile(previousImageUrl).catch(() => undefined);
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
  return mapCategory(data as CategoryRow);
}

export async function assignProductsToDashboardCategory(
  productIds: string[],
  category: CatalogCategory | null,
) {
  await requireDashboardStaff();
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return;
  const { error } = await supabase
    .from("store_products")
    .update({
      category_id: category?.id ?? null,
      product_type: category?.name ?? null,
    })
    .in("id", ids);
  throwIfError(error, "Assigning products to category failed");
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
}

export async function deleteDashboardCategory(
  categoryId: string,
  destinationCategoryId: string | null,
) {
  await requireDashboardStaff();
  const { error } = await supabase.rpc(
    "delete_store_category",
    rpcArgs(destinationCategoryId
      ? {
          p_category_id: categoryId,
          p_destination_category_id: destinationCategoryId,
        }
      : { p_category_id: categoryId },
  ));
  throwIfError(error, "Deleting category failed");
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
}

export async function reorderDashboardCategories(categories: CatalogCategory[]) {
  await requireDashboardStaff();
  const items = categories.map((category, index) => ({
    id: category.id,
    sort_order: index + 1,
  })) satisfies Json[];
  const { error } = await supabase.rpc("reorder_store_categories", rpcArgs({
    p_items: items as Json,
  }));
  throwIfError(error, "Saving category order failed");
  invalidateNativeStoreCache();
  broadcastStorefrontRefresh();
}

export async function refreshDashboardCategoryProducts() {
  return listDashboardProducts();
}
