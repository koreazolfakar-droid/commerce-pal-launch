import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import {
  getDashboardRole,
  listDashboardProducts,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";

type BrandRow = Tables<"cms_brands">;

export type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  featured: boolean;
  order: number;
  logo?: string;
  coverImage?: string;
  website?: string;
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

function mapBrand(row: BrandRow): CatalogBrand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    active: row.is_visible,
    featured: row.is_featured,
    order: row.sort_order,
    ...(row.logo_url ? { logo: row.logo_url } : {}),
    ...(row.cover_image_url ? { coverImage: row.cover_image_url } : {}),
    ...(row.href ? { website: row.href } : {}),
    ...(row.seo_title ? { seoTitle: row.seo_title } : {}),
    ...(row.seo_description ? { seoDescription: row.seo_description } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBrandPayload(brand: CatalogBrand) {
  return {
    name: brand.name.trim(),
    slug: normalizeBrandSlug(brand.slug || brand.name),
    description: brand.description.trim(),
    is_visible: brand.active,
    is_featured: brand.featured,
    sort_order: Math.max(0, Math.trunc(brand.order)),
    logo_url: brand.logo?.trim() || null,
    cover_image_url: brand.coverImage?.trim() || null,
    href: brand.website?.trim() || null,
    seo_title: brand.seoTitle?.trim() || null,
    seo_description: brand.seoDescription?.trim() || null,
  };
}

export function normalizeBrandSlug(value: string) {
  return value
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createUniqueBrandSlug(
  value: string,
  brands: CatalogBrand[],
  excludeId?: string,
) {
  const base = normalizeBrandSlug(value) || "brand";
  const used = new Set(
    brands
      .filter((brand) => brand.id !== excludeId)
      .map((brand) => brand.slug.toLowerCase()),
  );
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function productBelongsToBrand(product: DashboardProduct, brand: CatalogBrand) {
  return product.brandId === brand.id;
}

export function getProductsForBrand(products: DashboardProduct[], brand: CatalogBrand) {
  return products.filter((product) => productBelongsToBrand(product, brand));
}

export function getBrandProductCount(products: DashboardProduct[], brand: CatalogBrand) {
  return getProductsForBrand(products, brand).length;
}

export function countProductsAssignedToValidBrands(
  products: DashboardProduct[],
  brands: CatalogBrand[],
) {
  const valid = new Set(brands.map((brand) => brand.id));
  return products.filter((product) => product.brandId && valid.has(product.brandId)).length;
}

export async function loadBrandsWorkspace() {
  await requireDashboardStaff();
  const [brandResult, products] = await Promise.all([
    supabase
      .from("cms_brands")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    listDashboardProducts(),
  ]);
  throwIfError(brandResult.error, "Loading brands failed");
  return {
    brands: ((brandResult.data ?? []) as BrandRow[]).map(mapBrand),
    products,
  };
}

export async function createDashboardBrand(brand: CatalogBrand) {
  await requireDashboardStaff();
  const payload = toBrandPayload(brand);
  const { data, error } = await supabase
    .from("cms_brands")
    .insert(payload)
    .select("*")
    .single();
  throwIfError(error, "Creating brand failed");
  if (!data) throw new Error("Creating brand returned no record.");
  invalidateNativeStoreCache();
  return mapBrand(data as BrandRow);
}

export async function updateDashboardBrand(brand: CatalogBrand) {
  await requireDashboardStaff();
  const payload = toBrandPayload(brand);
  const { data, error } = await supabase
    .from("cms_brands")
    .update(payload)
    .eq("id", brand.id)
    .select("*")
    .single();
  throwIfError(error, "Updating brand failed");
  if (!data) throw new Error("Updating brand returned no record.");
  invalidateNativeStoreCache();
  return mapBrand(data as BrandRow);
}

export async function assignProductsToDashboardBrand(productIds: string[], brandId: string | null) {
  await requireDashboardStaff();
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return;
  const { error } = await supabase
    .from("store_products")
    .update({ brand_id: brandId })
    .in("id", ids);
  throwIfError(error, "Assigning products to brand failed");
  invalidateNativeStoreCache();
}

export async function deleteDashboardBrand(
  brandId: string,
  destinationBrandId: string | null,
) {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("delete_store_brand", {
    p_brand_id: brandId,
    p_destination_brand_id: destinationBrandId,
  });
  throwIfError(error, "Deleting brand failed");
  invalidateNativeStoreCache();
}

export async function reorderDashboardBrands(brands: CatalogBrand[]) {
  await requireDashboardStaff();
  const items = brands.map((brand, index) => ({
    id: brand.id,
    sort_order: index + 1,
  })) satisfies Json[];
  const { error } = await supabase.rpc("reorder_store_brands", {
    p_items: items as Json,
  });
  throwIfError(error, "Saving brand order failed");
  invalidateNativeStoreCache();
}

export async function refreshDashboardProducts() {
  return listDashboardProducts();
}
