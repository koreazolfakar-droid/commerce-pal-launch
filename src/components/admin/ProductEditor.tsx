import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/adminMedia";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

type ProductStatus = "draft" | "active" | "archived";

type ProductRow = {
  id: string;
  title: string;
  title_ar: string | null;
  handle: string;
  description: string;
  description_ar: string | null;
  brand_id: string | null;
  category_id: string | null;
  product_type: string | null;
  status: ProductStatus;
  currency: string;
  base_price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  featured: boolean;
  best_seller: boolean;
  tags: string[];
  specifications: Record<string, unknown>;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  published_at: string | null;
};

type EditingProduct = ProductRow & {
  tagsText: string;
  specificationsText: string;
  isDraft?: boolean;
};

type Brand = { id: string; name: string };
type Category = { id: string; name: string };
type Variant = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  options: Record<string, unknown>;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};
type ImageRow = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

const EMPTY_PRODUCT: EditingProduct = {
  id: "__draft__",
  title: "",
  title_ar: "",
  handle: "",
  description: "",
  description_ar: "",
  brand_id: null,
  category_id: null,
  product_type: "",
  status: "draft",
  currency: "USD",
  base_price: 0,
  compare_at_price: null,
  stock_quantity: 0,
  featured: false,
  best_seller: false,
  tags: [],
  specifications: {},
  seo_title: "",
  seo_description: "",
  sort_order: 0,
  published_at: null,
  tagsText: "",
  specificationsText: "{}",
  isDraft: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toEditing(row: ProductRow): EditingProduct {
  return {
    ...row,
    tagsText: (row.tags ?? []).join(", "),
    specificationsText: JSON.stringify(row.specifications ?? {}, null, 2),
  };
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProductEditor() {
  const { text } = useDashboardLanguage();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<EditingProduct | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      `${product.title} ${product.handle} ${product.product_type ?? ""}`.toLowerCase().includes(q),
    );
  }, [products, search]);

  const loadBase = async () => {
    setLoading(true);
    const [productsResult, brandsResult, categoriesResult] = await Promise.all([
      supabase
        .from("store_products" as never)
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("cms_brands" as never)
        .select("id,name")
        .order("name"),
      supabase
        .from("store_categories" as never)
        .select("id,name")
        .order("sort_order"),
    ]);

    const firstError = productsResult.error || brandsResult.error || categoriesResult.error;
    if (firstError) toast.error(firstError.message);

    const nextProducts = (productsResult.data ?? []) as ProductRow[];
    setProducts(nextProducts);
    setBrands((brandsResult.data ?? []) as Brand[]);
    setCategories((categoriesResult.data ?? []) as Category[]);
    setLoading(false);

    if (!editing && nextProducts[0]) void selectProduct(nextProducts[0]);
  };

  const loadRelations = async (productId: string) => {
    const [variantResult, imageResult] = await Promise.all([
      supabase
        .from("store_product_variants" as never)
        .select("*")
        .eq("product_id", productId)
        .order("sort_order"),
      supabase
        .from("store_product_images" as never)
        .select("*")
        .eq("product_id", productId)
        .order("sort_order"),
    ]);
    if (variantResult.error) toast.error(variantResult.error.message);
    if (imageResult.error) toast.error(imageResult.error.message);
    setVariants((variantResult.data ?? []) as Variant[]);
    setImages((imageResult.data ?? []) as ImageRow[]);
  };

  const selectProduct = async (product: ProductRow) => {
    setEditing(toEditing(product));
    await loadRelations(product.id);
  };

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchProduct = (patch: Partial<EditingProduct>) => {
    setEditing((current) => (current ? { ...current, ...patch } : current));
  };

  const startDraft = () => {
    setEditing({ ...EMPTY_PRODUCT });
    setVariants([]);
    setImages([]);
  };

  const saveProduct = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    const handle = editing.handle.trim() || slugify(title);
    if (!title || !handle) {
      toast.error(text("الاسم والـ handle مطلوبان", "Product name and handle are required"));
      return;
    }

    let specifications: Record<string, unknown>;
    try {
      const parsed = JSON.parse(editing.specificationsText || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      specifications = parsed;
    } catch {
      toast.error(text("صيغة Specifications JSON غير صحيحة", "Specifications JSON is invalid"));
      return;
    }

    setSaving(true);
    const payload = {
      title,
      title_ar: editing.title_ar?.trim() || null,
      handle,
      description: editing.description ?? "",
      description_ar: editing.description_ar?.trim() || null,
      brand_id: editing.brand_id || null,
      category_id: editing.category_id || null,
      product_type: editing.product_type?.trim() || null,
      status: editing.status,
      currency: (editing.currency || "USD").toUpperCase().slice(0, 3),
      base_price: Number(editing.base_price) || 0,
      compare_at_price: editing.compare_at_price,
      featured: editing.featured,
      best_seller: editing.best_seller,
      tags: editing.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      specifications,
      seo_title: editing.seo_title?.trim() || null,
      seo_description: editing.seo_description?.trim() || null,
      sort_order: Number(editing.sort_order) || 0,
      published_at:
        editing.status === "active"
          ? (editing.published_at ?? new Date().toISOString())
          : editing.published_at,
    };

    const result = editing.isDraft
      ? await supabase
          .from("store_products" as never)
          .insert(payload as never)
          .select("*")
          .single()
      : await supabase
          .from("store_products" as never)
          .update(payload as never)
          .eq("id", editing.id)
          .select("*")
          .single();

    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    const saved = result.data as ProductRow;
    setEditing(toEditing(saved));
    toast.success(
      editing.isDraft
        ? text("تم إنشاء المنتج", "Product created")
        : text("تم حفظ المنتج", "Product saved"),
    );
    await loadBase();
    if (editing.isDraft) await loadRelations(saved.id);
  };

  const deleteProduct = async () => {
    if (!editing) return;
    if (editing.isDraft) {
      setEditing(null);
      return;
    }
    if (
      !window.confirm(text(`حذف ${editing.title} نهائياً؟`, `Delete ${editing.title} permanently?`))
    )
      return;
    const { error } = await supabase
      .from("store_products" as never)
      .delete()
      .eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(text("تم حذف المنتج", "Product deleted"));
    setEditing(null);
    setVariants([]);
    setImages([]);
    await loadBase();
  };

  const addVariant = async () => {
    if (!editing || editing.isDraft) {
      toast.error(
        text("احفظ المنتج أولاً ثم أضف Variants", "Save the product before adding variants"),
      );
      return;
    }
    const { data, error } = await supabase
      .from("store_product_variants" as never)
      .insert({
        product_id: editing.id,
        title: "Default",
        price: Number(editing.base_price) || 0,
        stock_quantity: 0,
        sort_order: variants.length,
        is_active: true,
      } as never)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setVariants((current) => [...current, data as Variant]);
    toast.success(text("تمت إضافة Variant", "Variant added"));
  };

  const patchVariant = (id: string, patch: Partial<Variant>) => {
    setVariants((current) =>
      current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    );
  };

  const saveVariant = async (variant: Variant) => {
    const { error } = await supabase
      .from("store_product_variants" as never)
      .update({
        title: variant.title.trim() || "Default",
        sku: variant.sku?.trim() || null,
        barcode: variant.barcode?.trim() || null,
        price: Number(variant.price) || 0,
        compare_at_price: variant.compare_at_price,
        stock_quantity: Math.max(0, Number(variant.stock_quantity) || 0),
        options: variant.options ?? {},
        image_url: variant.image_url?.trim() || null,
        sort_order: Number(variant.sort_order) || 0,
        is_active: variant.is_active,
      } as never)
      .eq("id", variant.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(text("تم حفظ Variant والمخزون", "Variant and stock saved"));
    const refreshed = (await supabase
      .from("store_products" as never)
      .select("*")
      .eq("id", variant.product_id)
      .single()) as unknown as { data: ProductRow | null };
    if (refreshed.data) setEditing(toEditing(refreshed.data));
  };

  const deleteVariant = async (id: string) => {
    if (!window.confirm(text("حذف الـ Variant؟", "Delete this variant?"))) return;
    const { error } = await supabase
      .from("store_product_variants" as never)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setVariants((current) => current.filter((variant) => variant.id !== id));
    toast.success(text("تم حذف Variant", "Variant deleted"));
  };

  const uploadProductImage = async (file: File) => {
    if (!editing || editing.isDraft) {
      toast.error(
        text("احفظ المنتج أولاً ثم ارفع الصور", "Save the product before uploading images"),
      );
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, `products/${editing.id}`);
      const { data, error } = await supabase
        .from("store_product_images" as never)
        .insert({
          product_id: editing.id,
          url,
          alt_text: editing.title,
          sort_order: images.length,
          is_primary: images.length === 0,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      setImages((current) => [...current, data as ImageRow]);
      toast.success(text("تم رفع الصورة", "Image uploaded"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("تعذّر رفع الصورة", "Image upload failed"),
      );
    } finally {
      setUploading(false);
    }
  };

  const setPrimaryImage = async (id: string) => {
    if (!editing || editing.isDraft) return;
    const clear = await supabase
      .from("store_product_images" as never)
      .update({ is_primary: false } as never)
      .eq("product_id", editing.id);
    if (clear.error) {
      toast.error(clear.error.message);
      return;
    }
    const setPrimary = await supabase
      .from("store_product_images" as never)
      .update({ is_primary: true } as never)
      .eq("id", id);
    if (setPrimary.error) {
      toast.error(setPrimary.error.message);
      return;
    }
    setImages((current) => current.map((image) => ({ ...image, is_primary: image.id === id })));
    toast.success(text("تم تعيين الصورة الرئيسية", "Primary image set"));
  };

  const deleteImage = async (id: string) => {
    const { error } = await supabase
      .from("store_product_images" as never)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setImages((current) => current.filter((image) => image.id !== id));
    toast.success(text("تم حذف الصورة من المنتج", "Image removed from product"));
  };

  if (loading) {
    return (
      <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />{" "}
        {text("جاري تحميل المنتجات…", "Loading products…")}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Native Commerce</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {text("المنتجات والمخزون", "Products & inventory")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
            {text(
              "إدارة المنتجات والأسعار والـ Variants والصور والمخزون مباشرة من Supabase بدون Shopify.",
              "Manage products, prices, variants, images and inventory directly in Supabase without Shopify.",
            )}
          </p>
        </div>
        <Button
          onClick={startDraft}
          className="rounded-xl bg-foreground text-background hover:bg-foreground/90"
        >
          <PackagePlus className="me-2 size-4" /> {text("منتج جديد", "New product")}
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/70 bg-card p-3 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text("بحث بالاسم أو handle…", "Search by name or handle…")}
            className="h-10 rounded-xl"
          />
          <div className="mt-3 space-y-1.5">
            {filteredProducts.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                {text("لا توجد منتجات بعد.", "No products yet.")}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => void selectProduct(product)}
                  className={`w-full rounded-xl px-3 py-2.5 text-start transition ${editing?.id === product.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
                >
                  <p className="truncate text-xs font-bold">{product.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-70">
                    <span className="truncate">{product.handle}</span>
                    <span>{product.status}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {!editing ? (
          <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
            {text("اختر منتجاً أو أنشئ منتجاً جديداً.", "Select a product or create a new one.")}
          </div>
        ) : (
          <div className="space-y-5">
            <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {text("منتج", "Product")}
                  </p>
                  <h2 className="text-sm font-black">
                    {editing.title || text("منتج جديد", "New product")}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void saveProduct()}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="me-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Save className="me-1.5 size-3.5" />
                    )}{" "}
                    {text("حفظ", "Save")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-destructive"
                    onClick={() => void deleteProduct()}
                    aria-label={text("حذف المنتج", "Delete product")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
                <Field label={text("اسم المنتج *", "Product name *")}>
                  <Input
                    value={editing.title}
                    onChange={(e) =>
                      patchProduct({
                        title: e.target.value,
                        ...(editing.isDraft && !editing.handle
                          ? { handle: slugify(e.target.value) }
                          : {}),
                      })
                    }
                  />
                </Field>
                <Field label="Handle *">
                  <Input
                    value={editing.handle}
                    onChange={(e) => patchProduct({ handle: slugify(e.target.value) })}
                  />
                </Field>
                <Field label={text("الاسم بالعربي", "Arabic name")}>
                  <Input
                    value={editing.title_ar ?? ""}
                    onChange={(e) => patchProduct({ title_ar: e.target.value })}
                  />
                </Field>
                <Field label={text("نوع المنتج", "Product type")}>
                  <Input
                    value={editing.product_type ?? ""}
                    onChange={(e) => patchProduct({ product_type: e.target.value })}
                    placeholder="Smartphone"
                  />
                </Field>
                <Field label={text("البراند", "Brand")}>
                  <select
                    value={editing.brand_id ?? ""}
                    onChange={(e) => patchProduct({ brand_id: e.target.value || null })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{text("بدون براند", "No brand")}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={text("التصنيف", "Category")}>
                  <select
                    value={editing.category_id ?? ""}
                    onChange={(e) => patchProduct({ category_id: e.target.value || null })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{text("بدون تصنيف", "No category")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={text("الحالة", "Status")}>
                  <select
                    value={editing.status}
                    onChange={(e) => patchProduct({ status: e.target.value as ProductStatus })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="draft">{text("مسودة", "Draft")}</option>
                    <option value="active">{text("نشط", "Active")}</option>
                    <option value="archived">{text("مؤرشف", "Archived")}</option>
                  </select>
                </Field>
                <Field label={text("العملة", "Currency")}>
                  <Input
                    value={editing.currency}
                    maxLength={3}
                    onChange={(e) => patchProduct({ currency: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label={text("السعر الأساسي", "Base price")}>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.base_price}
                    onChange={(e) => patchProduct({ base_price: Number(e.target.value) })}
                  />
                </Field>
                <Field label={text("السعر قبل الخصم", "Compare at price")}>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.compare_at_price ?? ""}
                    onChange={(e) =>
                      patchProduct({ compare_at_price: numberOrNull(e.target.value) })
                    }
                  />
                </Field>
                <Field label={text("المخزون الحالي", "Current stock")}>
                  <Input value={editing.stock_quantity} readOnly className="bg-muted/40" />
                </Field>
                <Field label={text("الترتيب", "Sort order")}>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => patchProduct({ sort_order: Number(e.target.value) })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label={text("الوصف", "Description")}>
                    <Textarea
                      rows={5}
                      value={editing.description}
                      onChange={(e) => patchProduct({ description: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={text("الوصف بالعربي", "Arabic description")}>
                    <Textarea
                      rows={4}
                      value={editing.description_ar ?? ""}
                      onChange={(e) => patchProduct({ description_ar: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={text("Tags (مفصولة بفواصل)", "Tags (comma separated)")}>
                    <Input
                      value={editing.tagsText}
                      onChange={(e) => patchProduct({ tagsText: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Specifications JSON">
                    <Textarea
                      rows={7}
                      className="font-mono text-xs"
                      value={editing.specificationsText}
                      onChange={(e) => patchProduct({ specificationsText: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="SEO Title">
                  <Input
                    value={editing.seo_title ?? ""}
                    onChange={(e) => patchProduct({ seo_title: e.target.value })}
                  />
                </Field>
                <Field label="SEO Description">
                  <Input
                    value={editing.seo_description ?? ""}
                    onChange={(e) => patchProduct({ seo_description: e.target.value })}
                  />
                </Field>
                <ToggleField
                  label={text("مميز", "Featured")}
                  checked={editing.featured}
                  onChange={(checked) => patchProduct({ featured: checked })}
                />
                <ToggleField
                  label={text("الأكثر مبيعاً", "Best seller")}
                  checked={editing.best_seller}
                  onChange={(checked) => patchProduct({ best_seller: checked })}
                />
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black">
                    {text("Variants والمخزون", "Variants & inventory")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text(
                      "السعر والمخزون الحقيقيان يُحسبان من الـVariants.",
                      "The actual price and stock are calculated from variants.",
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void addVariant()}
                >
                  <Plus className="me-1.5 size-4" /> {text("Variant جديد", "Add variant")}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {variants.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                    {text("لا يوجد Variants بعد.", "No variants yet.")}
                  </p>
                ) : (
                  variants.map((variant) => (
                    <div key={variant.id} className="rounded-xl border border-border/70 p-3">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Field label={text("العنوان", "Title")}>
                          <Input
                            value={variant.title}
                            onChange={(e) => patchVariant(variant.id, { title: e.target.value })}
                          />
                        </Field>
                        <Field label="SKU">
                          <Input
                            value={variant.sku ?? ""}
                            onChange={(e) => patchVariant(variant.id, { sku: e.target.value })}
                          />
                        </Field>
                        <Field label="Barcode">
                          <Input
                            value={variant.barcode ?? ""}
                            onChange={(e) => patchVariant(variant.id, { barcode: e.target.value })}
                          />
                        </Field>
                        <Field label={text("السعر", "Price")}>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) =>
                              patchVariant(variant.id, { price: Number(e.target.value) })
                            }
                          />
                        </Field>
                        <Field label={text("السعر قبل الخصم", "Compare at price")}>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.compare_at_price ?? ""}
                            onChange={(e) =>
                              patchVariant(variant.id, {
                                compare_at_price: numberOrNull(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label={text("المخزون", "Stock")}>
                          <Input
                            type="number"
                            value={variant.stock_quantity}
                            onChange={(e) =>
                              patchVariant(variant.id, {
                                stock_quantity: Math.max(0, Number(e.target.value)),
                              })
                            }
                          />
                        </Field>
                        <Field label="Options JSON">
                          <Input
                            value={JSON.stringify(variant.options ?? {})}
                            onChange={(e) => {
                              try {
                                patchVariant(variant.id, {
                                  options: JSON.parse(e.target.value || "{}"),
                                });
                              } catch {
                                /* keep previous valid value */
                              }
                            }}
                          />
                        </Field>
                        <ToggleField
                          label={text("نشط", "Active")}
                          checked={variant.is_active}
                          onChange={(checked) => patchVariant(variant.id, { is_active: checked })}
                        />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void saveVariant(variant)}
                        >
                          <Save className="me-1.5 size-3.5" /> {text("حفظ", "Save")}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => void deleteVariant(variant.id)}
                          aria-label={text("حذف Variant", "Delete variant")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black">{text("صور المنتج", "Product images")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text(
                      "الصور تُحفظ مباشرة في Supabase Storage.",
                      "Images are saved directly to Supabase Storage.",
                    )}
                  </p>
                </div>
                <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted">
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}{" "}
                  {text("رفع صورة", "Upload image")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadProductImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`overflow-hidden rounded-xl border ${image.is_primary ? "border-foreground" : "border-border"}`}
                  >
                    <div className="aspect-square bg-white p-2">
                      <img
                        src={image.url}
                        alt={image.alt_text ?? ""}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 border-t p-2">
                      <button
                        type="button"
                        onClick={() => void setPrimaryImage(image.id)}
                        className="truncate text-[10px] font-bold"
                      >
                        {image.is_primary
                          ? text("الرئيسية", "Primary")
                          : text("اجعلها رئيسية", "Make primary")}
                      </button>
                      <button
                        type="button"
                        className="text-destructive"
                        onClick={() => void deleteImage(image.id)}
                        aria-label={text("حذف الصورة", "Delete image")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between rounded-xl border border-border/70 px-3">
      <span className="text-xs font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
