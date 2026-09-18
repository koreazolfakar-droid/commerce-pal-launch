import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { invalidateNativeStoreCache } from "@/lib/nativeStore";
import { convertProductImageToWebp, type ProductImageResolution } from "@/dashboard/lib/imageProcessing";

type ProductRow = Tables<"store_products">;
type VariantRow = Tables<"store_product_variants">;
type ImageRow = Tables<"store_product_images">;

export type DashboardRole = "admin" | "editor";

export type DashboardBrand = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  logo: string | null;
};

export type DashboardCategory = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type DashboardCollection = {
  id: string;
  title: string;
  handle: string;
  active: boolean;
};

export type DashboardProduct = {
  id: string;
  handle: string;
  name: string;
  description: string;
  brand: string;
  brandId: string | null;
  category: string;
  categoryId: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  status: "Active" | "Draft" | "Archived";
  sku: string;
  barcode: string;
  image: string;
  seoTitle: string;
  seoDescription: string;
  variantCount: number;
};

export type DashboardProductInput = {
  id?: string;
  title: string;
  description: string;
  brandId: string | null;
  categoryId: string | null;
  status: DashboardProduct["status"];
  price: number;
  compareAt: number | null;
  sku: string;
  barcode: string;
  stock: number;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
  collectionId: string | null;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function statusFromDb(status: string): DashboardProduct["status"] {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

function statusToDb(status: DashboardProduct["status"]) {
  return status.toLowerCase() as "active" | "draft" | "archived";
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

async function requireDashboardRole(): Promise<DashboardRole> {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

export async function getDashboardRole(): Promise<DashboardRole | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.role === "admin" || data.role === "editor" ? data.role : null;
}

export async function signInDashboard(email: string, password: string): Promise<DashboardRole> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  throwIfError(error, "Sign in failed");
  const role = await getDashboardRole();
  if (!role) {
    await supabase.auth.signOut();
    throw new Error("This account does not have dashboard access.");
  }
  return role;
}

export async function signOutDashboard() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error, "Sign out failed");
}

export async function listDashboardBrands(): Promise<DashboardBrand[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("cms_brands")
    .select("id,name,slug,is_visible,logo_url")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(error, "Loading brands failed");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.is_visible,
    logo: row.logo_url,
  }));
}

export async function listDashboardCategories(): Promise<DashboardCategory[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("store_categories")
    .select("id,name,slug,is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(error, "Loading categories failed");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.is_active,
  }));
}

export async function listDashboardCollections(): Promise<DashboardCollection[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("store_collections")
    .select("id,title,handle,is_active")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  throwIfError(error, "Loading collections failed");
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    handle: row.handle,
    active: row.is_active,
  }));
}

function firstImage(images: ImageRow[]) {
  return [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0];
}

export async function listDashboardProducts(): Promise<DashboardProduct[]> {
  await requireDashboardRole();
  const [productResult, variantResult, imageResult, brandResult, categoryResult] = await Promise.all([
    supabase.from("store_products").select("*").order("updated_at", { ascending: false }),
    supabase.from("store_product_variants").select("*").order("sort_order", { ascending: true }),
    supabase.from("store_product_images").select("*").order("sort_order", { ascending: true }),
    supabase.from("cms_brands").select("id,name"),
    supabase.from("store_categories").select("id,name"),
  ]);
  throwIfError(productResult.error, "Loading products failed");
  throwIfError(variantResult.error, "Loading variants failed");
  throwIfError(imageResult.error, "Loading product images failed");
  throwIfError(brandResult.error, "Loading product brands failed");
  throwIfError(categoryResult.error, "Loading product categories failed");

  const variants = (variantResult.data ?? []) as VariantRow[];
  const images = (imageResult.data ?? []) as ImageRow[];
  const variantsByProduct = new Map<string, VariantRow[]>();
  const imagesByProduct = new Map<string, ImageRow[]>();
  for (const variant of variants) {
    const current = variantsByProduct.get(variant.product_id) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.product_id, current);
  }
  for (const image of images) {
    const current = imagesByProduct.get(image.product_id) ?? [];
    current.push(image);
    imagesByProduct.set(image.product_id, current);
  }
  const brands = new Map((brandResult.data ?? []).map((row) => [row.id, row.name]));
  const categories = new Map((categoryResult.data ?? []).map((row) => [row.id, row.name]));

  return ((productResult.data ?? []) as ProductRow[]).map((row) => {
    const productVariants = variantsByProduct.get(row.id) ?? [];
    const primary = productVariants[0];
    const image = firstImage(imagesByProduct.get(row.id) ?? []);
    return {
      id: row.id,
      handle: row.handle,
      name: row.title,
      description: row.description,
      brand: row.brand_id ? brands.get(row.brand_id) ?? "" : "",
      brandId: row.brand_id,
      category: row.category_id
        ? categories.get(row.category_id) ?? row.product_type ?? ""
        : row.product_type ?? "",
      categoryId: row.category_id,
      price: primary ? Number(primary.price) : Number(row.base_price),
      compareAt:
        primary?.compare_at_price == null
          ? row.compare_at_price == null
            ? null
            : Number(row.compare_at_price)
          : Number(primary.compare_at_price),
      stock: row.stock_quantity,
      status: statusFromDb(row.status),
      sku: primary?.sku ?? row.sku ?? "",
      barcode: primary?.barcode ?? row.barcode ?? "",
      image: image?.url ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
      variantCount: productVariants.length,
    };
  });
}

export async function getDashboardProduct(id: string): Promise<DashboardProduct | null> {
  const products = await listDashboardProducts();
  return products.find((product) => product.id === id) ?? null;
}

async function uniqueHandle(title: string, existingId?: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase
      .from("store_products")
      .select("id")
      .eq("handle", candidate)
      .maybeSingle();
    throwIfError(error, "Checking product handle failed");
    if (!data || data.id === existingId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function saveDashboardProduct(input: DashboardProductInput) {
  await requireDashboardRole();

  const [brands, categories] = await Promise.all([
    listDashboardBrands(),
    listDashboardCategories(),
  ]);
  const brand = input.brandId ? brands.find((item) => item.id === input.brandId) : undefined;
  const category = input.categoryId
    ? categories.find((item) => item.id === input.categoryId)
    : undefined;

  let existingProduct: Pick<ProductRow, "id" | "handle" | "published_at"> | null = null;
  if (input.id) {
    const { data, error } = await supabase
      .from("store_products")
      .select("id,handle,published_at")
      .eq("id", input.id)
      .maybeSingle();
    throwIfError(error, "Loading product before save failed");
    if (!data) throw new Error("Product not found.");
    existingProduct = data;
  }

  const handle = existingProduct?.handle ?? (await uniqueHandle(input.title));
  const productPayload = {
    title: input.title.trim(),
    handle,
    description: input.description.trim(),
    brand_id: input.brandId,
    category_id: input.categoryId,
    product_type: category?.name ?? null,
    status: statusToDb(input.status),
    currency: "USD",
    base_price: input.price,
    compare_at_price: input.compareAt,
    sku: input.sku.trim() || null,
    barcode: input.barcode.trim() || null,
    stock_quantity: Math.max(0, Math.trunc(input.stock)),
    track_inventory: true,
    seo_title: input.seoTitle.trim() || null,
    seo_description: input.seoDescription.trim() || null,
    published_at:
      input.status === "Active"
        ? existingProduct?.published_at ?? new Date().toISOString()
        : null,
  };

  let productId = input.id;
  if (input.id) {
    const { error } = await supabase.from("store_products").update(productPayload).eq("id", input.id);
    throwIfError(error, "Updating product failed");
  } else {
    const { data, error } = await supabase
      .from("store_products")
      .insert(productPayload)
      .select("id")
      .single();
    throwIfError(error, "Creating product failed");
    productId = data?.id;
  }
  if (!productId) throw new Error("Product save completed without an id.");

  const { data: existingVariants, error: variantReadError } = await supabase
    .from("store_product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  throwIfError(variantReadError, "Loading product variants failed");

  const variantRows = (existingVariants ?? []) as VariantRow[];
  let variantManagedSeparately = variantRows.length > 1;
  if (variantRows.length <= 1) {
    const variantPayload = {
      title: variantRows[0]?.title ?? "Default",
      sku: input.sku.trim() || null,
      barcode: input.barcode.trim() || null,
      price: input.price,
      compare_at_price: input.compareAt,
      stock_quantity: Math.max(0, Math.trunc(input.stock)),
      track_inventory: true,
      options: variantRows[0]?.options ?? {},
      is_active: true,
      sort_order: 0,
    };
    if (variantRows[0]) {
      const { error } = await supabase
        .from("store_product_variants")
        .update(variantPayload)
        .eq("id", variantRows[0].id);
      throwIfError(error, "Updating product variant failed");
    } else {
      const { error } = await supabase
        .from("store_product_variants")
        .insert({ ...variantPayload, product_id: productId });
      throwIfError(error, "Creating product variant failed");
    }
  }

  if (input.imageUrl.trim()) {
    const { data: existingImage, error: imageReadError } = await supabase
      .from("store_product_images")
      .select("id")
      .eq("product_id", productId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwIfError(imageReadError, "Loading product image failed");
    if (existingImage) {
      const { error } = await supabase
        .from("store_product_images")
        .update({ url: input.imageUrl.trim(), alt_text: input.title.trim(), is_primary: true })
        .eq("id", existingImage.id);
      throwIfError(error, "Updating product image failed");
    } else {
      const { error } = await supabase.from("store_product_images").insert({
        product_id: productId,
        url: input.imageUrl.trim(),
        alt_text: input.title.trim(),
        is_primary: true,
        sort_order: 0,
      });
      throwIfError(error, "Creating product image failed");
    }
  }

  if (input.collectionId) {
    const { error } = await supabase.from("store_collection_products").upsert(
      {
        collection_id: input.collectionId,
        product_id: productId,
        sort_order: 0,
      },
      { onConflict: "collection_id,product_id" },
    );
    throwIfError(error, "Assigning collection failed");
  }

  invalidateNativeStoreCache();
  return { id: productId, handle, variantManagedSeparately, brandName: brand?.name ?? "" };
}


export type DashboardProductImage = {
  id: string;
  productId: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

const PRODUCT_IMAGE_BUCKET = "cms-media";
const PRODUCT_IMAGE_PREFIX = "products";
const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

function mapProductImage(row: ImageRow): DashboardProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    altText: row.alt_text ?? "",
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export async function listDashboardProductImages(productId: string): Promise<DashboardProductImage[]> {
  await requireDashboardRole();
  const { data, error } = await supabase
    .from("store_product_images")
    .select("*")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error, "Loading product images failed");
  return ((data ?? []) as ImageRow[]).map(mapProductImage);
}

function productStoragePathFromUrl(url: string) {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const path = decodeURIComponent(url.slice(index + marker.length));
  return path.startsWith(`${PRODUCT_IMAGE_PREFIX}/`) ? path : null;
}

async function uploadProductImageFile(
  productId: string,
  source: File,
  resolution: ProductImageResolution,
) {
  const file = await convertProductImageToWebp(source, resolution);
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Converted product image must be 10 MB or smaller.");
  }

  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectPath = `${PRODUCT_IMAGE_PREFIX}/${productId}/${unique}.webp`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: "image/webp",
  });
  throwIfError(error, "Uploading product image failed");

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath);
  return { url: data.publicUrl, objectPath };
}

async function removeOwnedProductImageFile(url: string) {
  const objectPath = productStoragePathFromUrl(url);
  if (!objectPath) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath]);
  throwIfError(error, "Deleting product image file failed");
}

export async function uploadDashboardProductImage(
  productId: string,
  source: File,
  resolution: ProductImageResolution,
  altText = "",
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  const current = await listDashboardProductImages(productId);
  const nextOrder = current.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
  const shouldBePrimary = !current.some((image) => image.isPrimary);
  const uploaded = await uploadProductImageFile(productId, source, resolution);

  try {
    const { error } = await supabase.from("store_product_images").insert({
      product_id: productId,
      url: uploaded.url,
      alt_text: altText.trim() || source.name.replace(/\.[^.]+$/, ""),
      sort_order: nextOrder,
      is_primary: shouldBePrimary,
    });
    throwIfError(error, "Saving product image failed");
  } catch (error) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([uploaded.objectPath]);
    throw error;
  }

  invalidateNativeStoreCache();
  return listDashboardProductImages(productId);
}

export async function replaceDashboardProductImage(
  image: DashboardProductImage,
  source: File,
  resolution: ProductImageResolution,
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();
  const uploaded = await uploadProductImageFile(image.productId, source, resolution);

  try {
    const { error } = await supabase
      .from("store_product_images")
      .update({
        url: uploaded.url,
        alt_text: source.name.replace(/\.[^.]+$/, ""),
      })
      .eq("id", image.id)
      .eq("product_id", image.productId);
    throwIfError(error, "Replacing product image failed");
  } catch (error) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([uploaded.objectPath]);
    throw error;
  }

  await removeOwnedProductImageFile(image.url).catch(() => undefined);
  invalidateNativeStoreCache();
  return listDashboardProductImages(image.productId);
}

export async function setDashboardPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  const { error: resetError } = await supabase
    .from("store_product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);
  throwIfError(resetError, "Resetting primary product image failed");

  const { error } = await supabase
    .from("store_product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);
  throwIfError(error, "Setting primary product image failed");

  invalidateNativeStoreCache();
  return listDashboardProductImages(productId);
}

export async function deleteDashboardProductImage(
  image: DashboardProductImage,
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  const { error } = await supabase
    .from("store_product_images")
    .delete()
    .eq("id", image.id)
    .eq("product_id", image.productId);
  throwIfError(error, "Deleting product image failed");

  await removeOwnedProductImageFile(image.url).catch(() => undefined);

  const remaining = await listDashboardProductImages(image.productId);
  if (image.isPrimary && remaining[0]) {
    return setDashboardPrimaryProductImage(image.productId, remaining[0].id);
  }

  invalidateNativeStoreCache();
  return remaining;
}

export async function reorderDashboardProductImages(
  productId: string,
  orderedIds: string[],
): Promise<DashboardProductImage[]> {
  await requireDashboardRole();

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from("store_product_images")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("product_id", productId);
    throwIfError(error, "Reordering product images failed");
  }

  invalidateNativeStoreCache();
  return listDashboardProductImages(productId);
}
