import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Boxes,
  ImageIcon,
  Layers3,
  Loader2,
  Package,
  PackagePlus,
  RefreshCcw,
  Search,
  Tags,
  TriangleAlert,
} from "lucide-react";

import { NativeCatalogManager } from "@/components/admin/NativeCatalogManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { cn } from "@/lib/utils";

type ProductStatus = "draft" | "active" | "archived";
type Product = {
  id: string;
  title: string;
  handle: string;
  brand_id: string | null;
  category_id: string | null;
  status: ProductStatus;
  currency: string;
  base_price: number;
  stock_quantity: number;
  updated_at: string;
};

type Variant = {
  id: string;
  product_id: string;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type Brand = { id: string; name: string };
type Category = { id: string; name: string };

type CatalogData = {
  products: Product[];
  variants: Variant[];
  images: ProductImage[];
  brands: Brand[];
  categories: Category[];
};

const LOW_STOCK_THRESHOLD = 5;

async function loadCatalogOverview(): Promise<CatalogData> {
  const [productsResult, variantsResult, imagesResult, brandsResult, categoriesResult] =
    await Promise.all([
      supabase
        .from("store_products" as never)
        .select("id,title,handle,brand_id,category_id,status,currency,base_price,stock_quantity,updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("store_product_variants" as never)
        .select("id,product_id,stock_quantity,track_inventory,is_active")
        .order("sort_order"),
      supabase
        .from("store_product_images" as never)
        .select("id,product_id,url,is_primary,sort_order")
        .order("sort_order"),
      supabase.from("cms_brands" as never).select("id,name").order("name"),
      supabase.from("store_categories" as never).select("id,name").order("sort_order"),
    ]);

  const error =
    productsResult.error ||
    variantsResult.error ||
    imagesResult.error ||
    brandsResult.error ||
    categoriesResult.error;
  if (error) throw error;

  return {
    products: (productsResult.data ?? []) as Product[],
    variants: (variantsResult.data ?? []) as Variant[],
    images: (imagesResult.data ?? []) as ProductImage[],
    brands: (brandsResult.data ?? []) as Brand[],
    categories: (categoriesResult.data ?? []) as Category[],
  };
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

function statusClass(status: ProductStatus) {
  if (status === "active") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "archived") return "bg-slate-500/10 text-slate-500";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function CatalogWorkspace() {
  const { language, text } = useDashboardLanguage();
  const [mode, setMode] = useState<"overview" | "editor">("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ProductStatus>("all");

  const query = useQuery({
    queryKey: ["dashboard", "catalog-workspace-overview"],
    queryFn: loadCatalogOverview,
    staleTime: 15_000,
  });

  const summary = useMemo(() => {
    const data = query.data;
    if (!data) return null;

    const variantsByProduct = new Map<string, Variant[]>();
    data.variants.forEach((variant) => {
      const current = variantsByProduct.get(variant.product_id) ?? [];
      current.push(variant);
      variantsByProduct.set(variant.product_id, current);
    });

    const imageByProduct = new Map<string, ProductImage>();
    data.images.forEach((image) => {
      const current = imageByProduct.get(image.product_id);
      if (!current || image.is_primary || image.sort_order < current.sort_order) {
        imageByProduct.set(image.product_id, image);
      }
    });

    const brandById = new Map(data.brands.map((brand) => [brand.id, brand.name]));
    const categoryById = new Map(data.categories.map((category) => [category.id, category.name]));

    const rows = data.products.map((product) => {
      const productVariants = (variantsByProduct.get(product.id) ?? []).filter(
        (variant) => variant.is_active,
      );
      const stock = productVariants.length
        ? productVariants.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
        : Number(product.stock_quantity || 0);
      const trackedVariants = productVariants.filter((variant) => variant.track_inventory);
      const low = trackedVariants.some(
        (variant) => variant.stock_quantity >= 0 && variant.stock_quantity <= LOW_STOCK_THRESHOLD,
      );

      return {
        ...product,
        stock,
        low,
        variantCount: productVariants.length,
        imageUrl: imageByProduct.get(product.id)?.url ?? null,
        brand: product.brand_id ? brandById.get(product.brand_id) ?? "—" : "—",
        category: product.category_id ? categoryById.get(product.category_id) ?? "—" : "—",
      };
    });

    return {
      rows,
      totalUnits: rows.reduce((sum, row) => sum + row.stock, 0),
      active: rows.filter((row) => row.status === "active").length,
      drafts: rows.filter((row) => row.status === "draft").length,
      low: rows.filter((row) => row.low).length,
      variants: data.variants.filter((variant) => variant.is_active).length,
    };
  }, [query.data]);

  const filteredRows = useMemo(() => {
    if (!summary) return [];
    const q = search.trim().toLowerCase();
    return summary.rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return `${row.title} ${row.handle} ${row.brand} ${row.category}`.toLowerCase().includes(q);
    });
  }, [search, status, summary]);

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            {text("مركز الكتالوج", "Catalog control center")}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {text("المنتجات والكميات", "Products & quantities")}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-5 text-muted-foreground">
            {text(
              "شاهد حالة كل منتج وسعره ومخزونه وعدد الـVariants بسرعة، ثم افتح المحرر الكامل عند الحاجة.",
              "See product status, price, stock and variant count at a glance, then open the full editor only when needed.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCcw className={cn("me-2 size-4", query.isFetching && "animate-spin")} />
            {text("تحديث", "Refresh")}
          </Button>
          <Button className="rounded-xl" onClick={() => setMode("editor")}>
            <PackagePlus className="me-2 size-4" />
            {text("فتح محرر المنتجات", "Open product editor")}
          </Button>
        </div>
      </header>

      <div className="inline-flex w-full gap-1 rounded-2xl border border-border/70 bg-card p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => setMode("overview")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-xs font-black transition sm:flex-none",
            mode === "overview" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {text("نظرة عامة", "Catalog overview")}
        </button>
        <button
          type="button"
          onClick={() => setMode("editor")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-xs font-black transition sm:flex-none",
            mode === "editor" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {text("محرر المنتجات", "Product editor")}
        </button>
      </div>

      {mode === "editor" ? (
        <NativeCatalogManager />
      ) : query.isLoading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 rounded-3xl border border-border/70 bg-card text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {text("جاري تحميل الكتالوج…", "Loading catalog…")}
        </div>
      ) : query.isError || !summary ? (
        <div className="rounded-3xl border border-destructive/25 bg-destructive/5 p-6 text-sm text-destructive">
          {text("تعذر تحميل الكتالوج. حاول مرة أخرى.", "Unable to load the catalog. Please try again.")}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={Package} label={text("كل المنتجات", "All products")} value={summary.rows.length} />
            <Metric icon={Package} label={text("المنتجات النشطة", "Active products")} value={summary.active} />
            <Metric icon={Layers3} label={text("Variants النشطة", "Active variants")} value={summary.variants} />
            <Metric icon={Boxes} label={text("إجمالي الوحدات", "Total units")} value={summary.totalUnits} />
            <Metric
              icon={TriangleAlert}
              label={text("تحتاج انتباه", "Need attention")}
              value={summary.low}
              warning={summary.low > 0}
            />
          </div>

          <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={text("ابحث بالاسم، البراند أو التصنيف…", "Search by product, brand or category…")}
                  className="h-11 rounded-xl ps-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "active", "draft", "archived"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-[10px] font-black capitalize transition",
                      status === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {value === "all"
                      ? text("الكل", "All")
                      : value === "active"
                        ? text("نشط", "Active")
                        : value === "draft"
                          ? text("مسودة", "Draft")
                          : text("مؤرشف", "Archived")}
                  </button>
                ))}
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="grid min-h-60 place-items-center p-8 text-center text-sm text-muted-foreground">
                <div>
                  <Package className="mx-auto mb-3 size-7" />
                  {text("لا توجد منتجات مطابقة.", "No matching products.")}
                </div>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1050px] text-start">
                    <thead className="bg-muted/25 text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">{text("المنتج", "Product")}</th>
                        <th className="px-3 py-3">{text("الحالة", "Status")}</th>
                        <th className="px-3 py-3">{text("البراند / التصنيف", "Brand / category")}</th>
                        <th className="px-3 py-3">{text("السعر", "Price")}</th>
                        <th className="px-3 py-3">Variants</th>
                        <th className="px-3 py-3">{text("الكمية", "Quantity")}</th>
                        <th className="px-4 py-3 text-end">{text("إدارة", "Manage")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="border-t border-border/50 transition hover:bg-muted/20">
                          <td className="px-4 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <ProductImage url={row.imageUrl} title={row.title} />
                              <div className="min-w-0">
                                <p className="max-w-72 truncate text-xs font-black">{row.title}</p>
                                <p className="mt-0.5 max-w-72 truncate text-[10px] text-muted-foreground">{row.handle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black capitalize", statusClass(row.status))}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <p className="text-[11px] font-bold">{row.brand}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{row.category}</p>
                          </td>
                          <td className="px-3 py-3.5 text-xs font-black">{formatMoney(row.base_price, row.currency)}</td>
                          <td className="px-3 py-3.5 text-xs font-black">{row.variantCount}</td>
                          <td className="px-3 py-3.5">
                            <span
                              className={cn(
                                "inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-xs font-black",
                                row.low ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-foreground",
                              )}
                            >
                              {row.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-end">
                            <button
                              type="button"
                              onClick={() => setMode("editor")}
                              className="rounded-lg border border-border/70 px-3 py-2 text-[10px] font-black transition hover:bg-muted"
                            >
                              {text("فتح المحرر", "Open editor")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border/50 lg:hidden">
                  {filteredRows.map((row) => (
                    <article key={row.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <ProductImage url={row.imageUrl} title={row.title} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">{row.title}</p>
                              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{row.brand} · {row.category}</p>
                            </div>
                            <span className={cn("shrink-0 rounded-full px-2 py-1 text-[9px] font-black capitalize", statusClass(row.status))}>
                              {row.status}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-2.5 text-center">
                            <SmallMetric label={text("السعر", "Price")} value={formatMoney(row.base_price, row.currency)} />
                            <SmallMetric label="Variants" value={String(row.variantCount)} />
                            <SmallMetric label={text("الكمية", "Qty")} value={String(row.stock)} warning={row.low} />
                          </div>
                          <button
                            type="button"
                            onClick={() => setMode("editor")}
                            className="mt-3 w-full rounded-xl border border-border/70 py-2.5 text-[10px] font-black transition hover:bg-muted"
                          >
                            {text("فتح محرر المنتج", "Open product editor")}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            <Shortcut to="/dashboard/inventory" icon={Boxes} title={text("إدارة المخزون", "Inventory")} description={text("تعديل الكميات ومراجعة سجل الحركات", "Adjust quantities and review movement history")} />
            <Shortcut to="/dashboard/categories" icon={Tags} title={text("التصنيفات", "Categories")} description={text("تنظيم المنتجات حسب الأقسام", "Organize products by category")} />
            <Shortcut to="/dashboard/brands" icon={Tags} title={text("البراندات", "Brands")} description={text("إدارة أسماء وشعارات البراندات", "Manage brand names and logos")} />
          </div>
        </>
      )}
    </section>
  );
}

function ProductImage({ url, title }: { url: string | null; title: string }) {
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/35">
      {url ? (
        <img src={url} alt={title} className="size-full object-cover" loading="lazy" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  warning,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("grid size-9 place-items-center rounded-xl bg-primary/10 text-primary", warning && "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
          <Icon className="size-4" />
        </span>
        <strong className={cn("text-xl font-black", warning && "text-amber-600 dark:text-amber-400")}>{value.toLocaleString()}</strong>
      </div>
      <p className="mt-3 text-[10px] font-black text-muted-foreground">{label}</p>
    </div>
  );
}

function SmallMetric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 truncate text-[10px] font-black", warning && "text-amber-600 dark:text-amber-400")}>{value}</p>
    </div>
  );
}

function Shortcut({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/dashboard/inventory" | "/dashboard/categories" | "/dashboard/brands";
  icon: typeof Boxes;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="group rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/25 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black">{title}</p>
          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
