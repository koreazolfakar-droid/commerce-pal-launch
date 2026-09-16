import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeDollarSign,
  ImageIcon,
  ImagePlus,
  Layers3,
  Loader2,
  PackagePlus,
  Plus,
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
  handle: string;
  description: string;
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
  published_at: string | null;
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
  options: Record<string, unknown>;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type EditableVariant = VariantRow & {
  isDraft?: boolean;
  colorText: string;
  storageText: string;
};

type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

type Brand = { id: string; name: string };
type Category = { id: string; name: string };

type FormState = {
  id: string | null;
  title: string;
  handle: string;
  description: string;
  productType: string;
  brandId: string;
  categoryId: string;
  status: ProductStatus;
  currency: string;
  seedPrice: string;
  seedCompareAtPrice: string;
  seedStock: string;
  seedSku: string;
  seedBarcode: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  publishedAt: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  handle: "",
  description: "",
  productType: "",
  brandId: "",
  categoryId: "",
  status: "draft",
  currency: "USD",
  seedPrice: "0",
  seedCompareAtPrice: "",
  seedStock: "0",
  seedSku: "",
  seedBarcode: "",
  trackInventory: true,
  allowBackorder: false,
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

function optionalMoney(value: string | number | null) {
  if (value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatMoney(value: number, currency: string) {
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

function statusClasses(status: ProductStatus) {
  if (status === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "archived") return "bg-slate-500/10 text-slate-500";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

function optionText(options: Record<string, unknown>, key: string) {
  const value = options?.[key];
  return typeof value === "string" ? value : "";
}

function toEditableVariant(row: VariantRow): EditableVariant {
  return {
    ...row,
    colorText: optionText(row.options ?? {}, "color"),
    storageText: optionText(row.options ?? {}, "storage"),
  };
}

function toForm(product: ProductRow, variants: VariantRow[]): FormState {
  const firstVariant = variants[0] ?? null;
  const compareAt = firstVariant?.compare_at_price ?? product.compare_at_price;
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description ?? "",
    productType: product.product_type ?? "",
    brandId: product.brand_id ?? "",
    categoryId: product.category_id ?? "",
    status: product.status,
    currency: product.currency || "USD",
    seedPrice: String(firstVariant?.price ?? product.base_price ?? 0),
    seedCompareAtPrice: compareAt === null ? "" : String(compareAt),
    seedStock: String(firstVariant?.stock_quantity ?? product.stock_quantity ?? 0),
    seedSku: firstVariant?.sku ?? product.sku ?? "",
    seedBarcode: firstVariant?.barcode ?? product.barcode ?? "",
    trackInventory: firstVariant?.track_inventory ?? product.track_inventory,
    allowBackorder: firstVariant?.allow_backorder ?? product.allow_backorder,
    publishedAt: product.published_at,
  };
}

export function NativeCatalogManager() {
  const { text } = useDashboardLanguage();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [currentProduct, setCurrentProduct] = useState<ProductRow | null>(null);
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const patchForm = (patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!showArchived && product.status === "archived") return false;
      if (!query) return true;
      return `${product.title} ${product.handle} ${product.product_type ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [products, search, showArchived]);

  const loadProduct = async (product: ProductRow) => {
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
        .order("sort_order"),
    ]);

    if (variantResult.error) throw variantResult.error;
    if (imageResult.error) throw imageResult.error;

    const nextVariants = (variantResult.data ?? []) as VariantRow[];
    setCurrentProduct(product);
    setVariants(nextVariants.map(toEditableVariant));
    setImages((imageResult.data ?? []) as ProductImage[]);
    setForm(toForm(product, nextVariants));
  };

  const loadCatalog = async (preferredId: string | null = null) => {
    setLoading(true);
    try {
      const [productResult, brandResult, categoryResult] = await Promise.all([
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

      const firstError = productResult.error || brandResult.error || categoryResult.error;
      if (firstError) throw firstError;

      const nextProducts = (productResult.data ?? []) as ProductRow[];
      setProducts(nextProducts);
      setBrands((brandResult.data ?? []) as Brand[]);
      setCategories((categoryResult.data ?? []) as Category[]);

      const requestedId = preferredId ?? form.id;
      const nextSelected = requestedId
        ? nextProducts.find((item) => item.id === requestedId)
        : nextProducts[0];

      if (nextSelected) await loadProduct(nextSelected);
      else {
        setCurrentProduct(null);
        setVariants([]);
        setImages([]);
        setForm({ ...EMPTY_FORM });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : text("تعذر تحميل المنتجات", "Unable to load products"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewProduct = () => {
    setCurrentProduct(null);
    setVariants([]);
    setImages([]);
    setForm({ ...EMPTY_FORM });
  };

  const validateCurrency = () => {
    const currency = (form.currency || "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      toast.error(text("رمز العملة يجب أن يكون 3 أحرف", "Currency must be a 3-letter code"));
      return null;
    }
    return currency;
  };

  const saveProduct = async () => {
    const title = form.title.trim();
    const handle = form.handle.trim() || slugify(title);
    const currency = validateCurrency();

    if (!title || !handle) {
      toast.error(text("اسم المنتج والـ handle مطلوبان", "Product title and handle are required"));
      return;
    }
    if (!currency) return;

    const creating = form.id === null;
    let seedPrice = 0;
    let seedCompareAtPrice: number | null = null;
    let seedStock = 0;

    if (creating) {
      seedPrice = Number(form.seedPrice);
      seedCompareAtPrice = optionalMoney(form.seedCompareAtPrice);
      const rawStock = Number(form.seedStock);

      if (!Number.isFinite(seedPrice) || seedPrice < 0) {
        toast.error(text("السعر غير صالح", "Price is invalid"));
        return;
      }
      if (
        form.seedCompareAtPrice.trim() &&
        seedCompareAtPrice === null
      ) {
        toast.error(text("السعر قبل الخصم غير صالح", "Compare-at price is invalid"));
        return;
      }
      if (seedCompareAtPrice !== null && seedCompareAtPrice < seedPrice) {
        toast.error(
          text(
            "السعر قبل الخصم يجب أن يكون أكبر من أو يساوي السعر",
            "Compare-at price must be greater than or equal to price",
          ),
        );
        return;
      }
      if (!Number.isInteger(rawStock) || rawStock < 0) {
        toast.error(text("المخزون يجب أن يكون رقماً صحيحاً موجباً", "Stock must be a non-negative integer"));
        return;
      }
      seedStock = rawStock;
    }

    setSaving(true);
    try {
      const metadataPayload = {
        title,
        handle,
        description: form.description,
        product_type: form.productType.trim() || null,
        brand_id: form.brandId || null,
        category_id: form.categoryId || null,
        status: form.status,
        currency,
        published_at:
          form.status === "active" ? (form.publishedAt ?? new Date().toISOString()) : null,
      };

      let savedProduct: ProductRow;

      if (creating) {
        const result = await supabase
          .from("store_products" as never)
          .insert({
            ...metadataPayload,
            base_price: seedPrice,
            compare_at_price: seedCompareAtPrice,
            stock_quantity: seedStock,
            sku: form.seedSku.trim() || null,
            barcode: form.seedBarcode.trim() || null,
            track_inventory: form.trackInventory,
            allow_backorder: form.allowBackorder,
          } as never)
          .select("*")
          .single();
        if (result.error) throw result.error;
        savedProduct = result.data as ProductRow;

        const variantResult = await supabase
          .from("store_product_variants" as never)
          .insert({
            product_id: savedProduct.id,
            title: "Default",
            sku: form.seedSku.trim() || null,
            barcode: form.seedBarcode.trim() || null,
            price: seedPrice,
            compare_at_price: seedCompareAtPrice,
            stock_quantity: seedStock,
            track_inventory: form.trackInventory,
            allow_backorder: form.allowBackorder,
            options: {},
            sort_order: 0,
            is_active: true,
          } as never);

        if (variantResult.error) {
          toast.warning(
            text(
              "تم إنشاء المنتج، لكن تعذر إنشاء الـ Variant الأول. يمكنك إضافته من قسم Variants.",
              "Product was created, but its first variant failed. You can add it from Variants.",
            ),
          );
        } else {
          toast.success(text("تم إنشاء المنتج المحلي", "Local product created"));
        }
      } else {
        const result = await supabase
          .from("store_products" as never)
          .update(metadataPayload as never)
          .eq("id", form.id ?? "")
          .select("*")
          .single();
        if (result.error) throw result.error;
        savedProduct = result.data as ProductRow;
        toast.success(text("تم حفظ بيانات المنتج", "Product details saved"));
      }

      await loadCatalog(savedProduct.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("تعذر الحفظ", "Unable to save product"),
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async () => {
    if (!form.id) return;
    if (
      !window.confirm(
        text("أرشفة هذا المنتج بدون حذفه؟", "Archive this product without deleting it?"),
      )
    )
      return;

    const result = await supabase
      .from("store_products" as never)
      .update({ status: "archived", published_at: null } as never)
      .eq("id", form.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(text("تمت الأرشفة بدون حذف البيانات", "Archived without deleting data"));
    await loadCatalog(form.id);
  };

  const addVariant = () => {
    if (!form.id) {
      toast.error(text("احفظ المنتج أولاً", "Save the product first"));
      return;
    }

    const draft: EditableVariant = {
      id: `draft-${crypto.randomUUID()}`,
      product_id: form.id,
      title: "",
      sku: null,
      barcode: null,
      price: currentProduct?.base_price ?? 0,
      compare_at_price: null,
      stock_quantity: 0,
      track_inventory: true,
      allow_backorder: false,
      options: {},
      image_url: null,
      sort_order: variants.length,
      is_active: true,
      isDraft: true,
      colorText: "",
      storageText: "",
    };
    setVariants((current) => [...current, draft]);
  };

  const patchVariant = (id: string, patch: Partial<EditableVariant>) => {
    setVariants((current) =>
      current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    );
  };

  const discardDraftVariant = (id: string) => {
    setVariants((current) => current.filter((variant) => variant.id !== id));
  };

  const saveVariant = async (variant: EditableVariant) => {
    if (!form.id) return;

    const price = Number(variant.price);
    const compareAtPrice = optionalMoney(variant.compare_at_price);
    const stock = Number(variant.stock_quantity);

    if (!Number.isFinite(price) || price < 0) {
      toast.error(text("سعر الـ Variant غير صالح", "Variant price is invalid"));
      return;
    }
    if (variant.compare_at_price !== null && compareAtPrice === null) {
      toast.error(text("السعر قبل الخصم غير صالح", "Compare-at price is invalid"));
      return;
    }
    if (compareAtPrice !== null && compareAtPrice < price) {
      toast.error(
        text(
          "السعر قبل الخصم يجب أن يكون أكبر من أو يساوي السعر",
          "Compare-at price must be greater than or equal to price",
        ),
      );
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      toast.error(text("مخزون الـ Variant غير صالح", "Variant stock is invalid"));
      return;
    }

    const options = { ...(variant.options ?? {}) };
    if (variant.colorText.trim()) options.color = variant.colorText.trim();
    else delete options.color;
    if (variant.storageText.trim()) options.storage = variant.storageText.trim();
    else delete options.storage;

    const generatedTitle = [variant.colorText.trim(), variant.storageText.trim()]
      .filter(Boolean)
      .join(" / ");

    const payload = {
      product_id: form.id,
      title: variant.title.trim() || generatedTitle || "Default",
      sku: variant.sku?.trim() || null,
      barcode: variant.barcode?.trim() || null,
      price,
      compare_at_price: compareAtPrice,
      stock_quantity: stock,
      track_inventory: variant.track_inventory,
      allow_backorder: variant.allow_backorder,
      options,
      image_url: variant.image_url?.trim() || null,
      sort_order: Number(variant.sort_order) || 0,
      is_active: variant.is_active,
    };

    setSavingVariantId(variant.id);
    try {
      const result = variant.isDraft
        ? await supabase.from("store_product_variants" as never).insert(payload as never)
        : await supabase
            .from("store_product_variants" as never)
            .update(payload as never)
            .eq("id", variant.id);

      if (result.error) throw result.error;
      toast.success(
        variant.isDraft
          ? text("تمت إضافة Variant", "Variant added")
          : text("تم حفظ Variant", "Variant saved"),
      );
      await loadCatalog(form.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("تعذر حفظ Variant", "Unable to save variant"),
      );
    } finally {
      setSavingVariantId(null);
    }
  };

  const uploadProductImage = async (file: File) => {
    if (!form.id) {
      toast.error(text("احفظ المنتج أولاً ثم ارفع الصور", "Save the product before uploading images"));
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadMedia(file, `products/${form.id}`);
      const result = await supabase
        .from("store_product_images" as never)
        .insert({
          product_id: form.id,
          url,
          alt_text: form.title,
          sort_order: images.length,
          is_primary: images.length === 0,
        } as never);
      if (result.error) throw result.error;
      toast.success(text("تم رفع صورة المنتج", "Product image uploaded"));
      await loadCatalog(form.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("تعذر رفع الصورة", "Unable to upload image"),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!form.id) return;

    const primaryResult = await supabase
      .from("store_product_images" as never)
      .update({ is_primary: true } as never)
      .eq("id", imageId);
    if (primaryResult.error) {
      toast.error(primaryResult.error.message);
      return;
    }

    const clearOthers = await supabase
      .from("store_product_images" as never)
      .update({ is_primary: false } as never)
      .eq("product_id", form.id)
      .neq("id", imageId);
    if (clearOthers.error) {
      toast.error(clearOthers.error.message);
      return;
    }

    toast.success(text("تم تعيين الصورة الرئيسية", "Primary image updated"));
    await loadCatalog(form.id);
  };

  const removeImage = async (image: ProductImage) => {
    if (!form.id) return;
    if (!window.confirm(text("إزالة هذه الصورة من المنتج؟", "Remove this image from the product?"))) return;

    const result = await supabase
      .from("store_product_images" as never)
      .delete()
      .eq("id", image.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    const remaining = images.filter((item) => item.id !== image.id);
    if (image.is_primary && remaining[0]) {
      await supabase
        .from("store_product_images" as never)
        .update({ is_primary: true } as never)
        .eq("id", remaining[0].id);
    }

    toast.success(text("تمت إزالة الصورة", "Image removed"));
    await loadCatalog(form.id);
  };

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p>{text("الكتالوج المحلي", "Local catalog")}</p>
          <h1>{text("منتجات Space Call", "Space Call products")}</h1>
          <p>
            {text(
              "إدارة المنتجات والبراندات والتصنيفات والصور والـ Variants بشكل مستقل عن Shopify.",
              "Manage products, brands, categories, images and variants independently from Shopify.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void loadCatalog(form.id)}>
            <RefreshCcw className="me-2 size-4" />
            {text("تحديث", "Refresh")}
          </Button>
          <Button className="rounded-xl" onClick={startNewProduct}>
            <PackagePlus className="me-2 size-4" />
            {text("منتج جديد", "New product")}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-black">{text("مستقل عن Shopify", "Independent from Shopify")}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {text("لا توجد أي كتابة على Shopify", "No writes are sent to Shopify")}
              </p>
            </div>
          </div>
        </div>
        <SummaryCard label={text("المنتجات المحلية", "Local products")} value={products.length} />
        <SummaryCard
          label={text("النشطة", "Active")}
          value={products.filter((item) => item.status === "active").length}
        />
        <SummaryCard
          label={text("Variants للمنتج", "Product variants")}
          value={form.id ? variants.length : 0}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={text("بحث بالاسم أو النوع...", "Search title or type...")}
                className="ps-9"
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                className="size-4"
              />
              {text("إظهار المؤرشفة", "Show archived")}
            </label>
          </div>

          <div className="max-h-[720px] overflow-y-auto p-2">
            {loading ? (
              <div className="grid min-h-32 place-items-center">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                {text("لا توجد منتجات محلية بعد.", "No local products yet.")}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => void loadProduct(product)}
                  className={`mb-1 w-full rounded-xl p-3 text-start transition ${
                    form.id === product.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black">{product.title}</p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{product.handle}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses(product.status)}`}>
                      {product.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="font-black">{formatMoney(product.base_price, product.currency)}</span>
                    <span className="text-muted-foreground">
                      {product.stock_quantity} {text("مخزون", "stock")}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black">
                    {form.id
                      ? form.title || text("منتج محلي", "Local product")
                      : text("إنشاء منتج محلي", "Create local product")}
                  </h2>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-black text-blue-600 dark:text-blue-400">
                    SPACE CALL DB
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {text("Shopify يبقى منفصلاً ولن يتغير.", "Shopify stays separate and unchanged.")}
                </p>
              </div>
              <div className="flex gap-2">
                {form.id && form.status !== "archived" ? (
                  <Button variant="outline" className="rounded-xl" onClick={() => void archiveProduct()}>
                    <Archive className="me-2 size-4" />
                    {text("أرشفة", "Archive")}
                  </Button>
                ) : null}
                <Button className="rounded-xl" disabled={saving} onClick={() => void saveProduct()}>
                  {saving ? <Loader2 className="me-2 size-4 animate-spin" /> : <Save className="me-2 size-4" />}
                  {text("حفظ المنتج", "Save product")}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label={text("اسم المنتج", "Product title")}>
                <Input
                  value={form.title}
                  onChange={(event) =>
                    patchForm({
                      title: event.target.value,
                      ...(form.handle ? {} : { handle: slugify(event.target.value) }),
                    })
                  }
                />
              </Field>
              <Field label="Handle">
                <Input
                  value={form.handle}
                  onChange={(event) => patchForm({ handle: slugify(event.target.value) })}
                />
              </Field>
              <Field label={text("نوع المنتج", "Product type")}>
                <Input
                  value={form.productType}
                  onChange={(event) => patchForm({ productType: event.target.value })}
                  placeholder="Smartphone"
                />
              </Field>
              <Field label={text("الحالة", "Status")}>
                <select
                  value={form.status}
                  onChange={(event) => patchForm({ status: event.target.value as ProductStatus })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label={text("البراند", "Brand")}>
                <select
                  value={form.brandId}
                  onChange={(event) => patchForm({ brandId: event.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{text("بدون براند", "No brand")}</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <a href="/dashboard/brands" className="mt-1.5 inline-block text-[10px] font-bold text-primary hover:underline">
                  {text("إدارة البراندات", "Manage brands")}
                </a>
              </Field>
              <Field label={text("التصنيف", "Category")}>
                <select
                  value={form.categoryId}
                  onChange={(event) => patchForm({ categoryId: event.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{text("بدون تصنيف", "No category")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <a href="/dashboard/categories" className="mt-1.5 inline-block text-[10px] font-bold text-primary hover:underline">
                  {text("إدارة التصنيفات", "Manage categories")}
                </a>
              </Field>
              <Field label={text("العملة", "Currency")}>
                <Input
                  maxLength={3}
                  value={form.currency}
                  onChange={(event) => patchForm({ currency: event.target.value.toUpperCase() })}
                />
              </Field>
              <div className="lg:col-span-2">
                <Field label={text("الوصف", "Description")}>
                  <Textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) => patchForm({ description: event.target.value })}
                  />
                </Field>
              </div>
            </div>

            {!form.id ? (
              <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <BadgeDollarSign className="size-4 text-primary" />
                  <div>
                    <h3 className="text-xs font-black">{text("أول Variant", "Initial variant")}</h3>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {text(
                        "يُنشأ تلقائياً مع المنتج ويمكنك إضافة ألوان وسعات أخرى بعد الحفظ.",
                        "Created automatically with the product; add more colors and capacities after saving.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Field label={text("السعر", "Price")}>
                    <Input inputMode="decimal" value={form.seedPrice} onChange={(event) => patchForm({ seedPrice: event.target.value })} />
                  </Field>
                  <Field label={text("السعر قبل الخصم", "Compare-at price")}>
                    <Input inputMode="decimal" value={form.seedCompareAtPrice} onChange={(event) => patchForm({ seedCompareAtPrice: event.target.value })} />
                  </Field>
                  <Field label={text("المخزون", "Stock")}>
                    <Input inputMode="numeric" value={form.seedStock} onChange={(event) => patchForm({ seedStock: event.target.value })} />
                  </Field>
                  <Field label="SKU">
                    <Input value={form.seedSku} onChange={(event) => patchForm({ seedSku: event.target.value })} />
                  </Field>
                  <Field label="Barcode">
                    <Input value={form.seedBarcode} onChange={(event) => patchForm({ seedBarcode: event.target.value })} />
                  </Field>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <CheckField
                    label={text("تتبع المخزون", "Track inventory")}
                    checked={form.trackInventory}
                    onChange={(checked) => patchForm({ trackInventory: checked })}
                  />
                  <CheckField
                    label={text("السماح بالطلب عند النفاد", "Allow backorder")}
                    checked={form.allowBackorder}
                    onChange={(checked) => patchForm({ allowBackorder: checked })}
                  />
                </div>
              </div>
            ) : currentProduct ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric
                  label={text("السعر المعروض", "Displayed price")}
                  value={formatMoney(currentProduct.base_price, currentProduct.currency)}
                />
                <Metric
                  label={text("إجمالي المخزون", "Total stock")}
                  value={String(currentProduct.stock_quantity)}
                />
                <Metric
                  label={text("عدد الصور", "Images")}
                  value={String(images.length)}
                />
              </div>
            ) : null}
          </article>

          {form.id ? (
            <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Layers3 className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black">{text("Variants", "Variants")}</h3>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {text(
                        "كل لون أو سعة يمكن أن يملك سعره ومخزونه وSKU وصورته الخاصة. تعطيل Variant يحافظ على سجله بدلاً من حذفه.",
                        "Each color or capacity can have its own price, stock, SKU and image. Disabling a variant preserves its history instead of deleting it.",
                      )}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={addVariant}>
                  <Plus className="me-1.5 size-4" /> {text("إضافة Variant", "Add variant")}
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {variants.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                    {text("لا يوجد Variants بعد.", "No variants yet.")}
                  </div>
                ) : (
                  variants.map((variant, index) => (
                    <div key={variant.id} className="rounded-2xl border border-border/70 p-3 sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black">
                            {variant.title || `${text("Variant", "Variant")} ${index + 1}`}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted-foreground">
                            {variant.isDraft
                              ? text("غير محفوظ بعد", "Not saved yet")
                              : variant.is_active
                                ? text("نشط", "Active")
                                : text("معطّل ومحفوظ", "Disabled and preserved")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {variant.isDraft ? (
                            <Button size="sm" variant="ghost" onClick={() => discardDraftVariant(variant.id)}>
                              {text("إلغاء", "Cancel")}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingVariantId === variant.id}
                            onClick={() => void saveVariant(variant)}
                          >
                            {savingVariantId === variant.id ? (
                              <Loader2 className="me-1.5 size-3.5 animate-spin" />
                            ) : (
                              <Save className="me-1.5 size-3.5" />
                            )}
                            {text("حفظ", "Save")}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Field label={text("اسم Variant", "Variant title")}>
                          <Input
                            value={variant.title}
                            placeholder="Blue / 256GB"
                            onChange={(event) => patchVariant(variant.id, { title: event.target.value })}
                          />
                        </Field>
                        <Field label={text("اللون", "Color")}>
                          <Input
                            value={variant.colorText}
                            placeholder="Blue"
                            onChange={(event) => patchVariant(variant.id, { colorText: event.target.value })}
                          />
                        </Field>
                        <Field label={text("السعة", "Storage / capacity")}>
                          <Input
                            value={variant.storageText}
                            placeholder="256GB"
                            onChange={(event) => patchVariant(variant.id, { storageText: event.target.value })}
                          />
                        </Field>
                        <Field label="SKU">
                          <Input
                            value={variant.sku ?? ""}
                            onChange={(event) => patchVariant(variant.id, { sku: event.target.value })}
                          />
                        </Field>
                        <Field label="Barcode">
                          <Input
                            value={variant.barcode ?? ""}
                            onChange={(event) => patchVariant(variant.id, { barcode: event.target.value })}
                          />
                        </Field>
                        <Field label={text("السعر", "Price")}>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(event) => patchVariant(variant.id, { price: Number(event.target.value) })}
                          />
                        </Field>
                        <Field label={text("السعر قبل الخصم", "Compare-at price")}>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.compare_at_price ?? ""}
                            onChange={(event) =>
                              patchVariant(variant.id, {
                                compare_at_price: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                          />
                        </Field>
                        <Field label={text("المخزون", "Stock")}>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={variant.stock_quantity}
                            onChange={(event) =>
                              patchVariant(variant.id, { stock_quantity: Number(event.target.value) })
                            }
                          />
                        </Field>
                        <Field label={text("صورة Variant", "Variant image")}>
                          <select
                            value={variant.image_url ?? ""}
                            onChange={(event) => patchVariant(variant.id, { image_url: event.target.value || null })}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                          >
                            <option value="">{text("بدون صورة مخصصة", "Use product image")}</option>
                            {images.map((image, imageIndex) => (
                              <option key={image.id} value={image.url}>
                                {text("صورة", "Image")} {imageIndex + 1}
                                {image.is_primary ? ` · ${text("رئيسية", "Primary")}` : ""}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label={text("الترتيب", "Sort order")}>
                          <Input
                            type="number"
                            value={variant.sort_order}
                            onChange={(event) => patchVariant(variant.id, { sort_order: Number(event.target.value) })}
                          />
                        </Field>
                        <CheckField
                          label={text("Variant نشط", "Variant active")}
                          checked={variant.is_active}
                          onChange={(checked) => patchVariant(variant.id, { is_active: checked })}
                        />
                        <CheckField
                          label={text("تتبع المخزون", "Track inventory")}
                          checked={variant.track_inventory}
                          onChange={(checked) => patchVariant(variant.id, { track_inventory: checked })}
                        />
                        <CheckField
                          label={text("السماح بالطلب عند النفاد", "Allow backorder")}
                          checked={variant.allow_backorder}
                          onChange={(checked) => patchVariant(variant.id, { allow_backorder: checked })}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ) : null}

          {form.id ? (
            <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ImageIcon className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black">{text("صور المنتج", "Product images")}</h3>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {text(
                        "ارفع عدة صور، اختر الصورة الرئيسية، ويمكن ربط صورة مختلفة بكل Variant.",
                        "Upload multiple images, choose a primary image, and assign a different image to each variant.",
                      )}
                    </p>
                  </div>
                </div>
                <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted">
                  {uploadingImage ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {text("رفع صورة", "Upload image")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadProductImage(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              {images.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  {text("لا توجد صور بعد.", "No images yet.")}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`overflow-hidden rounded-2xl border ${
                        image.is_primary ? "border-primary ring-1 ring-primary/20" : "border-border/70"
                      }`}
                    >
                      <div className="aspect-square bg-white p-2">
                        <img
                          src={image.url}
                          alt={image.alt_text ?? form.title}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="border-t border-border/60 p-2">
                        <p className="truncate text-[9px] font-bold text-muted-foreground">
                          {text("صورة", "Image")} {index + 1}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void setPrimaryImage(image.id)}
                            className="rounded-lg bg-muted px-2 py-1 text-[9px] font-bold hover:bg-muted/70"
                          >
                            {image.is_primary
                              ? text("الرئيسية", "Primary")
                              : text("اجعلها رئيسية", "Make primary")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeImage(image)}
                            className="rounded-lg px-2 py-1 text-[9px] font-bold text-destructive hover:bg-destructive/10"
                          >
                            {text("إزالة", "Remove")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-3 text-xs font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4"
      />
      {label}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-[9px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
