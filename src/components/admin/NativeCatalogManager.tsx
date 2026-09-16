import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeDollarSign,
  ImagePlus,
  Loader2,
  PackagePlus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  featured: boolean;
  best_seller: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  sort_order: number;
  is_active: boolean;
};

type ImageRow = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type BrandRow = { id: string; name: string };
type CategoryRow = { id: string; name: string };

type FormState = {
  id: string | null;
  title: string;
  titleAr: string;
  handle: string;
  description: string;
  descriptionAr: string;
  brandId: string;
  categoryId: string;
  productType: string;
  status: ProductStatus;
  currency: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  sku: string;
  barcode: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  featured: boolean;
  bestSeller: boolean;
  publishedAt: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  titleAr: "",
  handle: "",
  description: "",
  descriptionAr: "",
  brandId: "",
  categoryId: "",
  productType: "",
  status: "draft",
  currency: "USD",
  price: "0",
  compareAtPrice: "",
  stockQuantity: "0",
  sku: "",
  barcode: "",
  trackInventory: true,
  allowBackorder: false,
  featured: false,
  bestSeller: false,
  publishedAt: null,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency || "USD"}`;
  }
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function productToForm(product: ProductRow, variant: VariantRow | null): FormState {
  return {
    id: product.id,
    title: product.title,
    titleAr: product.title_ar ?? "",
    handle: product.handle,
    description: product.description ?? "",
    descriptionAr: product.description_ar ?? "",
    brandId: product.brand_id ?? "",
    categoryId: product.category_id ?? "",
    productType: product.product_type ?? "",
    status: product.status,
    currency: product.currency || "USD",
    price: String(variant?.price ?? product.base_price ?? 0),
    compareAtPrice:
      variant?.compare_at_price !== null && variant?.compare_at_price !== undefined
        ? String(variant.compare_at_price)
        : product.compare_at_price !== null
          ? String(product.compare_at_price)
          : "",
    stockQuantity: String(variant?.stock_quantity ?? product.stock_quantity ?? 0),
    sku: variant?.sku ?? product.sku ?? "",
    barcode: variant?.barcode ?? product.barcode ?? "",
    trackInventory: variant?.track_inventory ?? product.track_inventory,
    allowBackorder: variant?.allow_backorder ?? product.allow_backorder,
    featured: product.featured,
    bestSeller: product.best_seller,
    publishedAt: product.published_at,
  };
}

function statusClass(status: ProductStatus) {
  if (status === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "archived") return "bg-slate-500/10 text-slate-500";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

export function NativeCatalogManager() {
  const { text } = useDashboardLanguage();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.id) ?? null,
    [form.id, products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!showArchived && product.status === "archived") return false;
      if (!query) return true;
      return `${product.title} ${product.title_ar ?? ""} ${product.handle} ${product.sku ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [products, search, showArchived]);

  const patchForm = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  const loadProductRelations = async (product: ProductRow) => {
    const [variantResult, imageResult] = await Promise.all([
      supabase
        .from("store_product_variants" as never)
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order"),
      supabase
        .from("store_product_images" as never)
        .select("*")
        .eq("product_id", product.id)
        .order("is_primary", { ascending: false })
        .order("sort_order"),
    ]);

    if (variantResult.error) throw variantResult.error;
    if (imageResult.error) throw imageResult.error;

    const nextVariants = (variantResult.data ?? []) as VariantRow[];
    const nextImages = (imageResult.data ?? []) as ImageRow[];
    setVariants(nextVariants);
    setImages(nextImages);
    setForm(productToForm(product, nextVariants[0] ?? null));
  };

  const selectProduct = async (product: ProductRow) => {
    try {
      await loadProductRelations(product);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("تعذر تحميل المنتج", "Unable to load product"));
    }
  };

  const loadCatalog = async (preferredProductId?: string) => {
    setLoading(true);
    try {
      const [productResult, brandResult, categoryResult] = await Promise.all([
        supabase
          .from("store_products" as never)
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase.from("cms_brands" as never).select("id,name").order("name"),
        supabase.from("store_categories" as never).select("id,name").order("sort_order"),
      ]);

      const firstError = productResult.error || brandResult.error || categoryResult.error;
      if (firstError) throw firstError;

      const nextProducts = (productResult.data ?? []) as ProductRow[];
      setProducts(nextProducts);
      setBrands((brandResult.data ?? []) as BrandRow[]);
      setCategories((categoryResult.data ?? []) as CategoryRow[]);

      const preferred = preferredProductId
        ? nextProducts.find((product) => product.id === preferredProductId)
        : form.id
          ? nextProducts.find((product) => product.id === form.id)
          : nextProducts[0];
      if (preferred) await loadProductRelations(preferred);
      else if (!form.id) {
        setVariants([]);
        setImages([]);
        setForm({ ...EMPTY_FORM });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("تعذر تحميل الكتالوج", "Unable to load catalog"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setForm({ ...EMPTY_FORM });
    setVariants([]);
    setImages([]);
  };

  const save = async () => {
    const title = form.title.trim();
    const handle = form.handle.trim() || slugify(title);
    const price = Number(form.price);
    const stock = Math.max(0, Math.trunc(Number(form.stockQuantity) || 0));
    const compareAt = optionalNumber(form.compareAtPrice);

    if (!title || !handle) {
      toast.error(text("اسم المنتج والـ handle مطلوبان", "Product title and handle are required"));
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error(text("السعر غير صالح", "Price is invalid"));
      return;
    }
    if (compareAt !== null && compareAt < price) {
      toast.error(text("السعر قبل الخصم يجب أن يكون أكبر من السعر", "Compare-at price must be greater than or equal to price"));
      return;
    }

    setSaving(true);
    try {
      const productPayload = {
        title,
        title_ar: form.titleAr.trim() || null,
        handle,
        description: form.description,
        description_ar: form.descriptionAr.trim() || null,
        brand_id: form.brandId || null,
        category_id: form.categoryId || null,
        product_type: form.productType.trim() || null,
        status: form.status,
        currency: (form.currency || "USD").trim().toUpperCase().slice(0, 3),
        base_price: price,
        compare_at_price: compareAt,
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        stock_quantity: stock,
        track_inventory: form.trackInventory,
        allow_backorder: form.allowBackorder,
        featured: form.featured,
        best_seller: form.bestSeller,
        published_at:
          form.status === "active" ? (form.publishedAt ?? new Date().toISOString()) : null,
      };

      let product: ProductRow;
      let created = false;

      if (!form.id) {
        const result = await supabase
          .from("store_products" as never)
          .insert(productPayload as never)
          .select("*")
          .single();
        if (result.error) throw result.error;
        product = result.data as ProductRow;
        created = true;
      } else {
        const result = await supabase
          .from("store_products" as never)
          .update(productPayload as never)
          .eq("id", form.id)
          .select("*")
          .single();
        if (result.error) throw result.error;
        product = result.data as ProductRow;
      }

      const primaryVariant = variants[0] ?? null;
      const variantPayload = {
        product_id: product.id,
        title: primaryVariant?.title || "Default",
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        price,
        compare_at_price: compareAt,
        stock_quantity: stock,
        track_inventory: form.trackInventory,
        allow_backorder: form.allowBackorder,
        sort_order: primaryVariant?.sort_order ?? 0,
        is_active: true,
      };

      const variantResult = primaryVariant
        ? await supabase
            .from("store_product_variants" as never)
            .update(variantPayload as never)
            .eq("id", primaryVariant.id)
        : await supabase.from("store_product_variants" as never).insert(variantPayload as never);

      if (variantResult.error) {
        if (created) {
          await supabase.from("store_products" as never).delete().eq("id", product.id);
        }
        throw variantResult.error;
      }

      toast.success(
        created
          ? text("تم إنشاء المنتج المحلي", "Local product created")
          : text("تم حفظ المنتج والسعر", "Product and price saved"),
      );
      await loadCatalog(product.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("تعذر حفظ المنتج", "Unable to save product"));
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async () => {
    if (!form.id || !selectedProduct) return;
    if (!window.confirm(text(`أرشفة ${selectedProduct.title}؟`, `Archive ${selectedProduct.title}?`))) return;

    const { error } = await supabase
      .from("store_products" as never)
      .update({ status: "archived" } as never)
      .eq("id", form.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(text("تمت الأرشفة بدون حذف البيانات", "Archived without deleting data"));
    await loadCatalog(form.id);
  };

  const uploadPrimaryImage = async (file: File) => {
    if (!form.id) {
      toast.error(text("احفظ المنتج أولاً ثم ارفع الصورة", "Save the product before uploading an image"));
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, `products/${form.id}`);
      const clear = await supabase
        .from("store_product_images" as never)
        .update({ is_primary: false } as never)
        .eq("product_id", form.id);
      if (clear.error) throw clear.error;

      const insert = await supabase
        .from("store_product_images" as never)
        .insert({
          product_id: form.id,
          url,
          alt_text: form.title.trim() || null,
          sort_order: images.length,
          is_primary: true,
        } as never)
        .select("*")
        .single();
      if (insert.error) throw insert.error;
      setImages((current) => [insert.data as ImageRow, ...current.map((image) => ({ ...image, is_primary: false }))]);
      toast.success(text("تم رفع الصورة الرئيسية", "Primary image uploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("تعذر رفع الصورة", "Image upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const primaryImage = images.find((image) => image.is_primary) ?? images[0] ?? null;
  const hasMultipleVariants = variants.length > 1;

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p>{text("الكتالوج المحلي", "Local catalog")}</p>
          <h1>{text("منتجات Space Call", "Space Call products")}</h1>
          <p>
            {text(
              "أضف المنتجات وعدّل الأسعار والمخزون من لوحة التحكم بدون تعديل بيانات Shopify.",
              "Add products and manage prices and inventory from the dashboard without changing Shopify data.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void loadCatalog(form.id ?? undefined)}>
            <RefreshCcw className="me-2 size-4" />
            {text("تحديث", "Refresh")}
          </Button>
          <Button className="rounded-xl" onClick={startNew}>
            <PackagePlus className="me-2 size-4" />
            {text("منتج جديد", "New product")}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-black">{text("مستقل عن Shopify", "Independent from Shopify")}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{text("لا يتم إرسال أي تعديل إلى Shopify", "No edits are sent to Shopify")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{text("المنتجات المحلية", "Local products")}</p>
          <p className="mt-1 text-2xl font-black">{products.length}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{text("النشطة", "Active")}</p>
          <p className="mt-1 text-2xl font-black">{products.filter((product) => product.status === "active").length}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={text("بحث بالاسم أو SKU...", "Search title or SKU...")}
                className="h-10 rounded-xl ps-9"
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                className="size-4 rounded border-border"
              />
              {text("إظهار المؤرشفة", "Show archived")}
            </label>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-2">
            {loading ? (
              <div className="grid min-h-32 place-items-center"><Loader2 className="size-5 animate-spin text-primary" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                {text("لا توجد منتجات محلية بعد.", "No local products yet.")}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => void selectProduct(product)}
                  className={`mb-1 w-full rounded-xl p-3 text-start transition ${form.id === product.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-foreground">{product.title}</p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{product.handle}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClass(product.status)}`}>{product.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="font-black text-foreground">{money(product.base_price, product.currency)}</span>
                    <span className="text-muted-foreground">{product.stock_quantity} {text("مخزون", "stock")}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black">{form.id ? form.title || text("منتج محلي", "Local product") : text("إنشاء منتج محلي", "Create local product")}</h2>
                <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-black text-blue-600 dark:text-blue-400">SPACE CALL DB</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{text("Shopify يبقى منفصلاً ولن يتغير.", "Shopify stays separate and unchanged.")}</p>
            </div>
            <div className="flex gap-2">
              {form.id && form.status !== "archived" ? (
                <Button variant="outline" className="rounded-xl text-muted-foreground" onClick={() => void archiveProduct()}>
                  <Archive className="me-2 size-4" />
                  {text("أرشفة", "Archive")}
                </Button>
              ) : null}
              <Button className="rounded-xl" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="me-2 size-4 animate-spin" /> : <Save className="me-2 size-4" />}
                {text("حفظ", "Save")}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>{text("اسم المنتج", "Product title")}</Label>
              <Input value={form.title} onChange={(event) => patchForm({ title: event.target.value, ...(form.handle ? {} : { handle: slugify(event.target.value) }) })} />
            </div>
            <div className="space-y-2">
              <Label>{text("الاسم بالعربي", "Arabic title")}</Label>
              <Input value={form.titleAr} dir="rtl" onChange={(event) => patchForm({ titleAr: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Handle</Label>
              <Input value={form.handle} onChange={(event) => patchForm({ handle: slugify(event.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{text("الحالة", "Status")}</Label>
              <select value={form.status} onChange={(event) => patchForm({ status: event.target.value as ProductStatus })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <BadgeDollarSign className="size-4 text-primary" />
              <h3 className="text-xs font-black">{text("السعر والمخزون", "Price & inventory")}</h3>
            </div>
            {hasMultipleVariants ? (
              <p className="mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {text("هذا المنتج يحتوي عدة Variants. التعديل السريع أدناه يطبق على أول Variant فقط؛ سنضيف محرر Variants الكامل في المرحلة التالية.", "This product has multiple variants. Quick editing below applies to the first variant only; full variant management comes next.")}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>{text("السعر", "Price")}</Label>
                <Input inputMode="decimal" value={form.price} onChange={(event) => patchForm({ price: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{text("السعر قبل الخصم", "Compare-at price")}</Label>
                <Input inputMode="decimal" value={form.compareAtPrice} onChange={(event) => patchForm({ compareAtPrice: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{text("العملة", "Currency")}</Label>
                <Input maxLength={3} value={form.currency} onChange={(event) => patchForm({ currency: event.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>{text("المخزون", "Stock")}</Label>
                <Input inputMode="numeric" value={form.stockQuantity} onChange={(event) => patchForm({ stockQuantity: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(event) => patchForm({ sku: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(event) => patchForm({ barcode: event.target.value })} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>{text("الوصف", "Description")}</Label>
              <Textarea rows={5} value={form.description} onChange={(event) => patchForm({ description: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{text("الوصف بالعربي", "Arabic description")}</Label>
              <Textarea rows={5} dir="rtl" value={form.descriptionAr} onChange={(event) => patchForm({ descriptionAr: event.target.value })} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>{text("البراند", "Brand")}</Label>
              <select value={form.brandId} onChange={(event) => patchForm({ brandId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{text("التصنيف", "Category")}</Label>
              <select value={form.categoryId} onChange={(event) => patchForm({ categoryId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{text("نوع المنتج", "Product type")}</Label>
              <Input value={form.productType} onChange={(event) => patchForm({ productType: event.target.value })} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["trackInventory", text("تتبع المخزون", "Track inventory")],
              ["allowBackorder", text("السماح بالطلب المسبق", "Allow backorder")],
              ["featured", text("منتج مميز", "Featured")],
              ["bestSeller", text("الأكثر مبيعاً", "Best seller")],
            ].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 p-3 text-xs font-bold">
                <input type="checkbox" checked={Boolean(form[key as keyof FormState])} onChange={(event) => patchForm({ [key]: event.target.checked } as Partial<FormState>)} className="size-4" />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black">{text("الصورة الرئيسية", "Primary image")}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">{text("الصورة تحفظ في مساحة المتجر المحلي، وليس Shopify.", "Image is stored with the local catalog, not Shopify.")}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold transition hover:bg-muted">
                {uploading ? <Loader2 className="me-2 size-4 animate-spin" /> : <ImagePlus className="me-2 size-4" />}
                {text("رفع صورة", "Upload image")}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPrimaryImage(file); event.currentTarget.value = ""; }} />
              </label>
            </div>
            {primaryImage ? (
              <div className="mt-4 grid max-w-xs place-items-center rounded-xl bg-white p-3 ring-1 ring-border/60">
                <img src={primaryImage.url} alt={primaryImage.alt_text ?? form.title} className="max-h-48 w-full object-contain" loading="lazy" />
              </div>
            ) : (
              <div className="mt-4 grid h-28 place-items-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">{text("لا توجد صورة بعد", "No image yet")}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
