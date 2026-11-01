import DashboardListViews from "@/dashboard/components/layout/DashboardListViews";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import {
  Archive,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import {
  listDashboardBrands,
  listDashboardCategories,
  listDashboardProducts,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import {
  duplicateDashboardProduct,
  setDashboardProductsStatus,
} from "@/dashboard/data/productManagement";

type StatusFilter = "All" | "Active" | "Draft" | "Archived";
type StockFilter = "all" | "low" | "out" | "available";
type SortMode = "updated" | "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

function StatusPill({ status }: { status: DashboardProduct["status"] }) {
  const { t } = useLanguage();
  const tone =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>{t(status)}</span>
  );
}

export default function ProductsPage() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const money = (value: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar" : "en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  const [catalog, setCatalog] = useState<DashboardProduct[]>([]);
  const [brands, setBrands] = useState<Awaited<ReturnType<typeof listDashboardBrands>>>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listDashboardCategories>>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useDashboardQueryState<string>("search", "");
  const [status, setStatus] = useDashboardQueryState<StatusFilter>("status", "All", [
    "All",
    "Active",
    "Draft",
    "Archived",
  ]);
  const [brandId, setBrandId] = useDashboardQueryState<string>("brand", "");
  const [categoryId, setCategoryId] = useDashboardQueryState<string>("category", "");
  const [stock, setStock] = useDashboardQueryState<StockFilter>("stock", "all", [
    "all",
    "low",
    "out",
    "available",
  ]);
  const [sort, setSort] = useDashboardQueryState<SortMode>("sort", "updated", [
    "updated",
    "name",
    "price-asc",
    "price-desc",
    "stock-asc",
    "stock-desc",
  ]);

  const [page, setPage] = useDashboardQueryState<number>("page", 1);
  const [pageSize, setPageSize] = useDashboardQueryState<number>("pageSize", 20, [20, 50, 100]);
  const requestId = useRef(0);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    try {
      const [products, brandRows, categoryRows] = await Promise.all([
        listDashboardProducts(),
        listDashboardBrands(),
        listDashboardCategories(),
      ]);
      if (request !== requestId.current) return;
      setCatalog(products);
      setHasLoaded(true);
      setBrands(brandRows);
      setCategories(categoryRows);
      setSelected(
        (current) => new Set([...current].filter((id) => products.some((p) => p.id === id))),
      );
      setError("");
    } catch (cause) {
      if (request !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : "Unable to load products.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = catalog.filter((product) => {
      if (
        needle &&
        !`${product.name} ${product.brand} ${product.sku} ${product.barcode} ${product.handle} ${product.category}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (status !== "All" && product.status !== status) return false;
      if (brandId && product.brandId !== brandId) return false;
      if (categoryId && product.categoryId !== categoryId) return false;
      if (stock === "out" && product.stock !== 0) return false;
      if (stock === "low" && !(product.stock > 0 && product.stock <= 10)) return false;
      if (stock === "available" && product.stock <= 0) return false;
      return true;
    });

    return rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "stock-asc") return a.stock - b.stock;
      if (sort === "stock-desc") return b.stock - a.stock;
      return 0;
    });
  }, [brandId, catalog, categoryId, search, sort, status, stock]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allVisibleSelected =
    visible.length > 0 && visible.every((product) => selected.has(product.id));
  const someVisibleSelected = visible.some((product) => selected.has(product.id));
  useEffect(() => {
    if (selectAllRef.current)
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected, loading]);
  const hasFilters = Boolean(
    search || status !== "All" || brandId || categoryId || stock !== "all",
  );
  const resetFilters = () => {
    setSearch("");
    setStatus("All");
    setBrandId("");
    setCategoryId("");
    setStock("all");
    setPage(1);
  };
  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      visible.forEach((product) => {
        if (allVisibleSelected) next.delete(product.id);
        else next.add(product.id);
      });
      return next;
    });
  };
  const exportResults = () =>
    downloadCsv("space-call-products.csv", [
      ["Product", "SKU", "Barcode", "Brand", "Category", "Price (USD)", "Stock", "Status"],
      ...filtered.map((product) => [
        product.name,
        product.sku,
        product.barcode,
        product.brand,
        product.category,
        product.price,
        product.stock,
        product.status,
      ]),
    ]);

  const bulkStatus = async (nextStatus: "Active" | "Draft" | "Archived") => {
    const ids = [...selected];
    if (!ids.length || working) return;
    setWorking(true);
    try {
      const count = await setDashboardProductsStatus(ids, nextStatus);
      toast.success(`${count} product${count === 1 ? "" : "s"} moved to ${nextStatus}.`);
      setSelected(new Set());
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Bulk product update failed.");
    } finally {
      setWorking(false);
    }
  };

  const duplicate = async (product: DashboardProduct) => {
    if (working) return;
    setWorking(true);
    try {
      const newId = await duplicateDashboardProduct(product.id);
      toast.success("Draft copy created with zero stock and fresh identifiers.");
      navigate(`/dashboard/products/${newId}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product duplicate failed.");
    } finally {
      setWorking(false);
    }
  };

  const active = catalog.filter((product) => product.status === "Active").length;
  const drafts = catalog.filter((product) => product.status === "Draft").length;
  const archived = catalog.filter((product) => product.status === "Archived").length;
  const lowStock = catalog.filter((product) => product.stock > 0 && product.stock <= 10).length;

  return (
    <div>
      <div className="dashboard-page-header mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <PageTitle
            eyebrow="Commerce / Product management"
            title="Products"
            description="Manage live products, variants, stock state and merchandising without leaving the Space Call dashboard."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            disabled={loading || working}
            className="dashboard-button"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {t("Refresh")}
          </button>
          <button
            type="button"
            onClick={exportResults}
            disabled={loading || Boolean(error) || !filtered.length}
            className="dashboard-button"
          >
            <Download className="size-4" />
            {t("Export results")}
          </button>
          <button
            onClick={() => navigate("/dashboard/products/new")}
            className="dashboard-button dashboard-button-primary flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            <Plus className="size-4" /> {t("Add product")}
          </button>
        </div>
      </div>

      <button
        onClick={() => navigate("/dashboard/products/new")}
        aria-label={t("Add product")}
        className="dashboard-mobile-create fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-40 flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 lg:hidden"
      >
        <Plus className="size-4" /> {t("Add product")}
      </button>

      <DashboardListViews
        scope="products"
        keys={["status", "brand", "category", "stock", "sort", "pageSize"]}
        presets={[
          { name: "Drafts", query: "status=Draft" },
          { name: "Low stock", query: "stock=low" },
          { name: "Out of stock", query: "stock=out" },
        ]}
      />

      <div className="dashboard-catalog-metrics mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Total", catalog.length, "text-foreground"],
          ["Active", active, "text-emerald-600"],
          ["Draft", drafts, "text-amber-600"],
          ["Archived", archived, "text-slate-500"],
          ["Low-stock products", lowStock, "text-rose-600"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="dashboard-metric-card rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] font-semibold text-slate-400">{t(String(label))}</div>
            <div className={`mt-1 text-xl font-bold ${tone}`}>{loading || error ? "—" : value}</div>
          </div>
        ))}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{t("Low-stock products count product stock from 1 to 10 across all statuses, regardless of tracking.")}</p>

      <div className="dashboard-filter-panel mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="dashboard-catalog-filters">
          <label className="dashboard-filter-field dashboard-catalog-search">
            <span>{t("Search products...")}</span>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Product, brand, SKU, barcode or handle")}
                className="h-10 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-[12px] outline-none focus:border-indigo-400"
              />
            </div>
          </label>
          <Select
            label={t("Status")}
            value={status}
            onChange={(value) => setStatus(value as StatusFilter)}
          >
            <option value="All">{t("All")}</option>
            <option value="Active">{t("Active")}</option>
            <option value="Draft">{t("Draft")}</option>
            <option value="Archived">{t("Archived")}</option>
          </Select>
          <Select label={t("Brand")} value={brandId} onChange={setBrandId}>
            <option value="">{t("All brands")}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
          <Select label={t("Category")} value={categoryId} onChange={setCategoryId}>
            <option value="">{t("All categories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            label={t("Stock")}
            value={stock}
            onChange={(value) => setStock(value as StockFilter)}
          >
            <option value="all">{t("All stock")}</option>
            <option value="available">{t("In stock")}</option>
            <option value="low">{t("Low stock")}</option>
            <option value="out">{t("Out of stock")}</option>
          </Select>
          <Select
            label={t("Sort by")}
            value={sort}
            onChange={(value) => setSort(value as SortMode)}
          >
            <option value="updated">{t("Recently updated")}</option>
            <option value="name">{t("Name A–Z")}</option>
            <option value="price-asc">{t("Price ↑")}</option>
            <option value="price-desc">{t("Price ↓")}</option>
            <option value="stock-asc">{t("Stock ↑")}</option>
            <option value="stock-desc">{t("Stock ↓")}</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="dashboard-selection-note text-xs text-muted-foreground">
            <span role="status">
              {loading && !hasLoaded ? t("Loading…") : !hasLoaded ? t("Unable to load products.") : (
                <><Filter className="inline size-3.5" /> {filtered.length} {t("results")} · {selected.size} {t("selected across pages")}{loading ? ` · ${t("Refreshing…")}` : ""}</>
              )}
            </span>
            {hasFilters && (
              <button type="button" onClick={resetFilters} className="dashboard-inline-action">
                {t("Clear filters")}
              </button>
            )}
            {!!selected.size && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                disabled={working}
                className="dashboard-inline-action"
              >
                {t("Clear selection")}
              </button>
            )}
          </div>
          {selected.size ? (
            <div className="flex flex-wrap gap-2">
              <BulkButton disabled={working} onClick={() => void bulkStatus("Active")}>
                {t("Activate")}
              </BulkButton>
              <BulkButton disabled={working} onClick={() => void bulkStatus("Draft")}>
                {t("Move to draft")}
              </BulkButton>
              <BulkButton disabled={working} onClick={() => void bulkStatus("Archived")}>
                <Archive className="size-3.5" /> {t("Archive")}
              </BulkButton>
            </div>
          ) : null}
        </div>
      </div>

      {error && hasLoaded ? (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error} <button type="button" className="underline" onClick={() => void load()}>{t("Retry")}</button>
        </div>
      ) : null}
      {loading && !hasLoaded ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-6 animate-spin text-indigo-500" />
        </div>
      ) : error && !hasLoaded ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-semibold text-rose-700"
        >
          <p>{error}</p>
          <button onClick={() => void load()} className="dashboard-button mt-3">
            {t("Retry")}
          </button>
        </div>
      ) : (
        <div className="dashboard-catalog-panel overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div
            className="hidden overflow-x-auto md:block"
            role="region"
            aria-label={t("Products")}
            tabIndex={0}
          >
            <table className="w-full min-w-[980px] text-start">
              <thead className="bg-muted/45">
                <tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.1em] text-slate-400">
                  <th className="px-4 py-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label={t("Select visible")}
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      disabled={working}
                    />
                  </th>
                  <th className="px-3 py-3">{t("Product")}</th>
                  <th className="px-3 py-3">{t("SKU")}</th>
                  <th className="px-3 py-3">{t("Category")}</th>
                  <th className="px-3 py-3">{t("Variants")}</th>
                  <th className="px-3 py-3">{t("Price")}</th>
                  <th className="px-3 py-3">{t("Stock")}</th>
                  <th className="px-3 py-3">{t("Status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.id} className="border-b border-border/50 transition-colors hover:bg-muted/55">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        aria-label={`${t("Select product")}: ${product.name}`}
                        disabled={working}
                        checked={selected.has(product.id)}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(product.id)) next.delete(product.id);
                            else next.add(product.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        onClick={() => navigate(`/dashboard/products/${product.id}`)}
                        className="flex max-w-[280px] items-center gap-3 text-start"
                      >
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                          {product.image ? (
                            <img src={product.image} alt="" className="size-full object-contain" />
                          ) : (
                            <Package className="size-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {product.name}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {product.brand || t("No brand")} · {product.handle}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[10px] text-slate-500">
                      {product.sku || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-[11px] text-slate-500">
                      {product.category || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-[11px] font-bold text-slate-600">
                      {product.variantCount}
                    </td>
                    <td className="px-3 py-3.5 text-[11px] font-bold text-slate-700">
                      {money(product.price)}
                    </td>
                    <td
                      className={`px-3 py-3.5 text-[11px] font-bold ${product.stock === 0 ? "text-rose-600" : product.stock <= 10 ? "text-amber-600" : "text-slate-700"}`}
                    >
                      {product.stock}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={product.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => void duplicate(product)}
                          disabled={working}
                          aria-label={`${t("Duplicate")}: ${product.name}`}
                          className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                          title={t("Duplicate")}
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/products/${product.id}`)}
                          className="grid size-8 place-items-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title={t("Edit")}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border/70 md:hidden">
            <div className="flex items-center justify-between px-4 py-3 text-[10px] text-slate-400">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />{" "}
                {t("Select visible")}
              </label>
              <span>
                {filtered.length} {t("products")}
              </span>
            </div>
            {visible.map((product) => (
              <div key={product.id} className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`${t("Select product")}: ${product.name}`}
                    disabled={working}
                    checked={selected.has(product.id)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(product.id)) next.delete(product.id);
                        else next.add(product.id);
                        return next;
                      })
                    }
                    className="mt-4"
                  />
                  <button
                    onClick={() => navigate(`/dashboard/products/${product.id}`)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-start"
                  >
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                      {product.image ? (
                        <img src={product.image} alt="" className="size-full object-contain" />
                      ) : (
                        <Package className="size-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {product.name}
                      </div>
                      <div className="mt-1 truncate text-[10px] text-slate-400">
                        {product.brand || t("No brand")} · {product.category || t("Uncategorized")}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                        <StatusPill status={product.status} />
                        <span className="font-bold text-slate-700">{money(product.price)}</span>
                        <span
                          className={
                            product.stock <= 10 ? "font-bold text-rose-600" : "text-slate-500"
                          }
                        >
                          {product.stock} {t("stock")}
                        </span>
                        <span className="text-slate-400">
                          {product.variantCount} {t("variants")}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => void duplicate(product)}
                    disabled={working}
                    aria-label={`${t("Duplicate")}: ${product.name}`}
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="dashboard-catalog-footer">
              <span role="status">
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} {t("of")} {filtered.length}{" "}
                {t("products")}
              </span>
              <label>
                {t("Rows per page")}
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <div>
                <button
                  type="button"
                  className="dashboard-button"
                  aria-label={t("Previous page")}
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="dashboard-directional size-4" />
                </button>
                <span>
                  {currentPage} / {pageCount}
                </span>
                <button
                  type="button"
                  className="dashboard-button"
                  aria-label={t("Next page")}
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="dashboard-directional size-4" />
                </button>
              </div>
            </div>
          )}
          {!filtered.length ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-400">
              <Package className="size-8 opacity-50" />
              {t(
                hasFilters
                  ? "No products match the current filters."
                  : "Your catalog is ready for its first product.",
              )}
              {hasFilters && (
                <button type="button" onClick={resetFilters} className="dashboard-button">
                  {t("Clear filters")}
                </button>
              )}
              <button
                onClick={() => navigate("/dashboard/products/new")}
                className="dashboard-button dashboard-button-primary flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
              >
                <Plus className="size-4" /> {t("Add product")}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="dashboard-filter-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-400"
      >
        {children}
      </select>
    </label>
  );
}

function BulkButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
