import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeDollarSign,
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
import { useDashboardLanguage } from "@/lib/dashboardI18n";

type ProductStatus = "draft" | "active" | "archived";

type ProductRow = {
  id: string;
  title: string;
  handle: string;
  description: string;
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
  sort_order: number;
};

type FormState = {
  id: string | null;
  title: string;
  handle: string;
  description: string;
  status: ProductStatus;
  currency: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  barcode: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  publishedAt: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  handle: "",
  description: "",
  status: "draft",
  currency: "USD",
  price: "0",
  compareAtPrice: "",
  stock: "0",
  sku: "",
  barcode: "",
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

function optionalMoney(value: string) {
  if (!value.trim()) return null;
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

function toForm(product: ProductRow, variant: VariantRow | null): FormState {
  const compareAt = variant?.compare_at_price ?? product.compare_at_price;
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description ?? "",
    status: product.status,
    currency: product.currency || "USD",
    price: String(variant?.price ?? product.base_price ?? 0),
    compareAtPrice: compareAt === null ? "" : String(compareAt),
    stock: String(variant?.stock_quantity ?? product.stock_quantity ?? 0),
    sku: variant?.sku ?? product.sku ?? "",
    barcode: variant?.barcode ?? product.barcode ?? "",
    trackInventory: variant?.track_inventory ?? product.track_inventory,
    allowBackorder: variant?.allow_backorder ?? product.allow_backorder,
    publishedAt: product.published_at,
  };
}

export function NativeCatalogManager() {
  const { text } = useDashboardLanguage();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [variant, setVariant] = useState<VariantRow | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const patchForm = (patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!showArchived && product.status === "archived") return false;
      if (!query) return true;
      return `${product.title} ${product.handle} ${product.sku ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [products, search, showArchived]);

  const loadProduct = async (product: ProductRow) => {
    const result = await supabase
      .from("store_product_variants" as never)
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order")
      .limit(1);
    if (result.error) throw result.error;
    const firstVariant = ((result.data ?? []) as VariantRow[])[0] ?? null;
    setVariant(firstVariant);
    setForm(toForm(product, firstVariant));
  };

  const loadCatalog = async (preferredId: string | null = null) => {
    setLoading(true);
    try {
      const result = await supabase
        .from("store_products" as never)
        .select("*")
        .order("updated_at", { ascending: false });
      if (result.error) throw result.error;

      const nextProducts = (result.data ?? []) as ProductRow[];
      setProducts(nextProducts);

      const requestedId = preferredId ?? form.id;
      const nextSelected = requestedId
        ? nextProducts.find((item) => item.id === requestedId)
        : nextProducts[0];

      if (nextSelected) await loadProduct(nextSelected);
      else {
        setVariant(null);
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
    setVariant(null);
    setForm({ ...EMPTY_FORM });
  };

  const saveProduct = async () => {
    const title = form.title.trim();
    const handle = form.handle.trim() || slugify(title);
    const price = Number(form.price);
    const compareAtPrice = optionalMoney(form.compareAtPrice);
    const stock = Math.max(0, Math.trunc(Number(form.stock) || 0));

    if (!title || !handle) {
      toast.error(text("اسم المنتج والـ handle مطلوبان", "Product title and handle are required"));
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error(text("السعر غير صالح", "Price is invalid"));
      return;
    }
    if (compareAtPrice !== null && compareAtPrice < price) {
      toast.error(
        text(
          "السعر قبل الخصم يجب أن يكون أكبر من السعر",
          "Compare-at price must be greater than or equal to price",
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const currency = (form.currency || "USD").trim().toUpperCase().slice(0, 3);
      const payload = {
        title,
        handle,
        description: form.description,
        status: form.status,
        currency,
        base_price: price,
        compare_at_price: compareAtPrice,
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        stock_quantity: stock,
        track_inventory: form.trackInventory,
        allow_backorder: form.allowBackorder,
        published_at:
          form.status === "active" ? (form.publishedAt ?? new Date().toISOString()) : null,
      };

      let savedProduct: ProductRow;
      const creating = form.id === null;

      if (creating) {
        const result = await supabase
          .from("store_products" as never)
          .insert(payload as never)
          .select("*")
          .single();
        if (result.error) throw result.error;
        savedProduct = result.data as ProductRow;
      } else {
        const result = await supabase
          .from("store_products" as never)
          .update(payload as never)
          .eq("id", form.id ?? "")
          .select("*")
          .single();
        if (result.error) throw result.error;
        savedProduct = result.data as ProductRow;
      }

      const variantPayload = {
        product_id: savedProduct.id,
        title: variant?.title || "Default",
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        price,
        compare_at_price: compareAtPrice,
        stock_quantity: stock,
        track_inventory: form.trackInventory,
        allow_backorder: form.allowBackorder,
        sort_order: variant?.sort_order ?? 0,
        is_active: true,
      };

      const variantResult = variant
        ? await supabase
            .from("store_product_variants" as never)
            .update(variantPayload as never)
            .eq("id", variant.id)
        : await supabase.from("store_product_variants" as never).insert(variantPayload as never);

      if (variantResult.error) {
        toast.warning(
          text(
            "تم حفظ المنتج، لكن تعذر حفظ الـ Variant. لم نحذف أي بيانات؛ يمكنك إعادة المحاولة.",
            "Product was saved, but its variant failed. No data was deleted; you can retry.",
          ),
        );
      } else {
        toast.success(
          creating
            ? text("تم إنشاء المنتج المحلي", "Local product created")
            : text("تم حفظ السعر والمنتج", "Product and price saved"),
        );
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
    if (!window.confirm(text("أرشفة هذا المنتج بدون حذفه؟", "Archive this product without deleting it?"))) return;

    const result = await supabase
      .from("store_products" as never)
      .update({ status: "archived" } as never)
      .eq("id", form.id);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(text("تمت الأرشفة بدون حذف البيانات", "Archived without deleting data"));
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
              "إدارة منتجات وأسعار Space Call بشكل مستقل بالكامل عن Shopify.",
              "Manage Space Call products and prices independently from Shopify.",
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

      <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            {text("المنتجات المحلية", "Local products")}
          </p>
          <p className="mt-1 text-2xl font-black">{products.length}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            {text("النشطة", "Active")}
          </p>
          <p className="mt-1 text-2xl font-black">
            {products.filter((item) => item.status === "active").length}
          </p>
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
                className="size-4"
              />
              {text("إظهار المؤرشفة", "Show archived")}
            </label>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-2">
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
                    <span className="text-muted-foreground">{product.stock_quantity} {text("مخزون", "stock")}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">
                  {form.id ? form.title || text("منتج محلي", "Local product") : text("إنشاء منتج محلي", "Create local product")}
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
                {text("حفظ", "Save")}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>{text("اسم المنتج", "Product title")}</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  patchForm({
                    title: event.target.value,
                    ...(form.handle ? {} : { handle: slugify(event.target.value) }),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Handle</Label>
              <Input
                value={form.handle}
                onChange={(event) => patchForm({ handle: slugify(event.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{text("الحالة", "Status")}</Label>
              <select
                value={form.status}
                onChange={(event) => patchForm({ status: event.target.value as ProductStatus })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{text("العملة", "Currency")}</Label>
              <Input
                maxLength={3}
                value={form.currency}
                onChange={(event) => patchForm({ currency: event.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <BadgeDollarSign className="size-4 text-primary" />
              <h3 className="text-xs font-black">{text("السعر والمخزون", "Price & inventory")}</h3>
            </div>
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
                <Label>{text("المخزون", "Stock")}</Label>
                <Input inputMode="numeric" value={form.stock} onChange={(event) => patchForm({ stock: event.target.value })} />
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

          <div className="mt-5 space-y-2">
            <Label>{text("الوصف", "Description")}</Label>
            <Textarea
              rows={6}
              value={form.description}
              onChange={(event) => patchForm({ description: event.target.value })}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 p-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={form.trackInventory}
                onChange={(event) => patchForm({ trackInventory: event.target.checked })}
                className="size-4"
              />
              {text("تتبع المخزون", "Track inventory")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 p-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={form.allowBackorder}
                onChange={(event) => patchForm({ allowBackorder: event.target.checked })}
                className="size-4"
              />
              {text("السماح بالطلب عند نفاد المخزون", "Allow backorder")}
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
