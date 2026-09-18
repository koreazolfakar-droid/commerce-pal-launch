import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import {
  getDashboardRole,
  listDashboardProducts,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

type CategoryRow = Tables<"store_categories">;

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
  };
}

export function normalizeCategorySlug(value: string) {
  return value
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    })
    .select("*")
    .single();
  throwIfError(error, "Creating category failed");
  if (!data) throw new Error("Creating category returned no record.");
  invalidateNativeStoreCache();
  return mapCategory(data as CategoryRow);
}

export async function updateDashboardCategory(category: CatalogCategory) {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_category", {
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
  });
  throwIfError(error, "Updating category failed");

  const { data, error: readError } = await supabase
    .from("store_categories")
    .select("*")
    .eq("id", category.id)
    .single();
  throwIfError(readError, "Reloading category failed");
  if (!data) throw new Error("Updating category returned no record.");
  invalidateNativeStoreCache();
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
}

export async function deleteDashboardCategory(
  categoryId: string,
  destinationCategoryId: string | null,
) {
  await requireDashboardStaff();
  const { error } = await supabase.rpc(
    "delete_store_category",
    destinationCategoryId
      ? {
          p_category_id: categoryId,
          p_destination_category_id: destinationCategoryId,
        }
      : { p_category_id: categoryId },
  );
  throwIfError(error, "Deleting category failed");
  invalidateNativeStoreCache();
}

export async function reorderDashboardCategories(categories: CatalogCategory[]) {
  await requireDashboardStaff();
  const items = categories.map((category, index) => ({
    id: category.id,
    sort_order: index + 1,
  })) satisfies Json[];
  const { error } = await supabase.rpc("reorder_store_categories", {
    p_items: items as Json,
  });
  throwIfError(error, "Saving category order failed");
  invalidateNativeStoreCache();
}

export async function refreshDashboardCategoryProducts() {
  return listDashboardProducts();
}
