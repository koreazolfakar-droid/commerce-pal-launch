import { rpcArgs } from "@/dashboard/lib/rpcArgs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";

type CollectionRow = Tables<"store_collections">;
type ProductRow = Pick<
  Tables<"store_products">,
  "id" | "title" | "status" | "base_price" | "currency" | "stock_quantity" | "brand_id"
>;
type ProductImageRow = Pick<
  Tables<"store_product_images">,
  "product_id" | "url" | "is_primary" | "sort_order"
>;

export type DashboardCollectionListItem = {
  id: string;
  handle: string;
  title: string;
  titleAr: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DashboardCollectionProduct = {
  id: string;
  title: string;
  status: string;
  price: number;
  currency: string;
  stockQuantity: number;
  imageUrl: string;
  sortOrder: number;
};

export type DashboardCollectionDetail = DashboardCollectionListItem & {
  products: DashboardCollectionProduct[];
  availableProducts: DashboardCollectionProduct[];
};

export type DashboardCollectionInput = {
  title: string;
  handle: string;
  titleAr: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function mapCollection(row: CollectionRow, productCount = 0): DashboardCollectionListItem {
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    titleAr: row.title_ar ?? "",
    description: row.description,
    imageUrl: row.image_url ?? "",
    sortOrder: row.sort_order,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    productCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDashboardCollections(): Promise<DashboardCollectionListItem[]> {
  await requireDashboardStaff();

  const [collectionResult, membershipResult] = await Promise.all([
    supabase
      .from("store_collections")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    supabase.from("store_collection_products").select("collection_id"),
  ]);

  throwIfError(collectionResult.error, "Loading collections failed");
  throwIfError(membershipResult.error, "Loading collection memberships failed");

  const counts = new Map<string, number>();
  for (const item of membershipResult.data ?? []) {
    counts.set(item.collection_id, (counts.get(item.collection_id) ?? 0) + 1);
  }

  return ((collectionResult.data ?? []) as CollectionRow[]).map((row) =>
    mapCollection(row, counts.get(row.id) ?? 0),
  );
}

async function loadProductImages(productIds: string[]) {
  const imageByProduct = new Map<string, string>();
  if (!productIds.length) return imageByProduct;

  const { data, error } = await supabase
    .from("store_product_images")
    .select("product_id,url,is_primary,sort_order")
    .in("product_id", productIds)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  throwIfError(error, "Loading product images failed");
  for (const image of (data ?? []) as ProductImageRow[]) {
    if (!imageByProduct.has(image.product_id)) imageByProduct.set(image.product_id, image.url);
  }
  return imageByProduct;
}

export async function getDashboardCollection(id: string): Promise<DashboardCollectionDetail | null> {
  await requireDashboardStaff();

  const [collectionResult, membershipResult, productResult] = await Promise.all([
    supabase.from("store_collections").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("store_collection_products")
      .select("product_id,sort_order")
      .eq("collection_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("store_products")
      .select("id,title,status,base_price,currency,stock_quantity,brand_id")
      .order("title", { ascending: true }),
  ]);

  throwIfError(collectionResult.error, "Loading collection failed");
  throwIfError(membershipResult.error, "Loading collection products failed");
  throwIfError(productResult.error, "Loading products failed");
  if (!collectionResult.data) return null;

  const products = (productResult.data ?? []) as ProductRow[];
  const productIds = products.map((product) => product.id);
  const imageByProduct = await loadProductImages(productIds);

  const productById = new Map(products.map((product) => [product.id, product]));
  const memberIds = new Set((membershipResult.data ?? []).map((item) => item.product_id));

  const members: DashboardCollectionProduct[] = [];
  for (const membership of membershipResult.data ?? []) {
    const product = productById.get(membership.product_id);
    if (!product) continue;
    members.push({
      id: product.id,
      title: product.title,
      status: product.status,
      price: Number(product.base_price) || 0,
      currency: product.currency,
      stockQuantity: product.stock_quantity,
      imageUrl: imageByProduct.get(product.id) ?? "",
      sortOrder: membership.sort_order,
    });
  }

  const availableProducts = products
    .filter((product) => !memberIds.has(product.id))
    .map((product) => ({
      id: product.id,
      title: product.title,
      status: product.status,
      price: Number(product.base_price) || 0,
      currency: product.currency,
      stockQuantity: product.stock_quantity,
      imageUrl: imageByProduct.get(product.id) ?? "",
      sortOrder: 0,
    }));

  return {
    ...mapCollection(collectionResult.data as CollectionRow, members.length),
    products: members,
    availableProducts,
  };
}

export async function createDashboardCollection(
  input: DashboardCollectionInput,
): Promise<DashboardCollectionDetail | null> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("create_store_collection", rpcArgs({
    p_title: input.title,
    p_handle: input.handle,
    p_title_ar: input.titleAr || null,
    p_description: input.description,
    p_image_url: input.imageUrl || null,
    p_is_active: input.isActive,
    p_is_featured: input.isFeatured,
    p_seo_title: input.seoTitle || null,
    p_seo_description: input.seoDescription || null,
  }));
  throwIfError(error, "Creating collection failed");
  return data ? getDashboardCollection(data.id) : null;
}

export async function updateDashboardCollection(
  id: string,
  input: DashboardCollectionInput,
): Promise<DashboardCollectionDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_collection", rpcArgs({
    p_collection_id: id,
    p_title: input.title,
    p_handle: input.handle,
    p_title_ar: input.titleAr || null,
    p_description: input.description,
    p_image_url: input.imageUrl || null,
    p_is_active: input.isActive,
    p_is_featured: input.isFeatured,
    p_seo_title: input.seoTitle || null,
    p_seo_description: input.seoDescription || null,
  }));
  throwIfError(error, "Updating collection failed");
  return getDashboardCollection(id);
}

export async function deleteDashboardCollection(id: string): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("delete_store_collection", rpcArgs({ p_collection_id: id }));
  throwIfError(error, "Deleting collection failed");
}

export async function saveDashboardCollectionProducts(
  id: string,
  productIds: string[],
): Promise<DashboardCollectionDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("set_store_collection_products", rpcArgs({
    p_collection_id: id,
    p_product_ids: productIds,
  }));
  throwIfError(error, "Saving collection products failed");
  return getDashboardCollection(id);
}

export async function reorderDashboardCollections(
  collections: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("reorder_store_collections", rpcArgs({
    p_items: collections.map((item) => ({ id: item.id, sort_order: item.sortOrder })),
  }));
  throwIfError(error, "Reordering collections failed");
}
