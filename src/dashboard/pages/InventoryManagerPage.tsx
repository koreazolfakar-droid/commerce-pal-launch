import DashboardLoadError from "@/dashboard/components/DashboardLoadError";
import DashboardListViews from "@/dashboard/components/layout/DashboardListViews";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { useSearch } from "wouter";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDashboardRealtimeRefresh } from "@/dashboard/hooks/useDashboardRealtimeRefresh";
import InventoryMovementHistoryDrawer from "@/dashboard/components/inventory/InventoryMovementHistoryDrawer";
import InventoryGroupedList from "@/dashboard/components/inventory/InventoryGroupedList";
import {
  adjustInventoryDelta,
  loadInventoryCategoryOptions,
  loadInventoryLatestMovements,
  loadInventoryPage,
  loadInventorySummary,
  setInventoryStock,
  type InventoryCategoryOptions,
  type InventoryRow,
  type InventorySummary,
} from "@/dashboard/data/inventory";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function paginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 4) {
    start = 2;
    end = 5;
  } else if (currentPage >= totalPages - 3) {
    start = totalPages - 4;
    end = totalPages - 1;
  }

  if (start > 2) items.push("ellipsis-start");
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);

  return items;
}

export default function InventoryManagerPage() {
  const { t } = useLanguage();
  const urlSearch = useSearch();
  const attention = new URLSearchParams(urlSearch).get("attention");
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [query, setQuery] = useDashboardQueryState<string>("search", "");
  const [serverQuery, setServerQuery] = useState(query.trim());
  const [category, setCategory] = useDashboardQueryState<string>("category", "all");
  const [threshold, setThreshold] = useDashboardQueryState<number>(
    "threshold",
    attention === "out" ? 0 : 10,
  );
  const [onlyLow, setOnlyLow] = useDashboardQueryState<boolean>(
    "onlyLow",
    attention === "low" || attention === "out",
  );
  const [categories, setCategories] = useState<InventoryCategoryOptions>({
    items: [],
    hasUncategorized: false,
  });
  const [summary, setSummary] = useState<InventorySummary>({
    totalUnits: 0,
    variantCount: 0,
    lowCount: 0,
    outCount: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [productCountOnPage, setProductCountOnPage] = useState(0);
  const [paginationMode, setPaginationMode] = useState<"products" | "variants">("products");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movementLoading, setMovementLoading] = useState(false);
  const loadRequestRef = useRef(0);
  const summaryCacheRef = useRef(new Map<number, InventorySummary>());
  const movementRequestRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [movementVersion, setMovementVersion] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftStocks, setDraftStocks] = useState<Record<string, string>>({});
  const draftSnapshots = useRef(new Map<string, InventoryRow>());
  useEffect(() => {
    for (const [id] of Object.entries(draftStocks)) {
      if (!draftSnapshots.current.has(id)) {
        const row = rows.find((item) => item.variantId === id);
        if (row) draftSnapshots.current.set(id, row);
      }
    }
    for (const id of draftSnapshots.current.keys())
      if (!(id in draftStocks)) draftSnapshots.current.delete(id);
  }, [draftStocks, rows]);
  const inventoryDirty = Object.entries(draftStocks).some(
    ([id, value]) =>
      value !==
      String(
        draftSnapshots.current.get(id)?.stock ?? rows.find((row) => row.variantId === id)?.stock,
      ),
  );
  useDashboardUnsavedChanges(inventoryDirty);
  const [historyRow, setHistoryRow] = useState<InventoryRow | null>(null);
  const [page, setPage] = useDashboardQueryState<number>("page", 1);
  const [pageSize, setPageSize] = useDashboardQueryState<number>("pageSize", 20, [20, 50, 100]);

  const load = useCallback(
    async (manual = false) => {
      const requestId = ++loadRequestRef.current;
      if (manual) setRefreshing(true);
      else if (!hasLoadedRef.current) setLoading(true);

      try {
        // Search, category and pagination do not change this threshold summary.
        const cachedSummary = manual ? undefined : summaryCacheRef.current.get(threshold);
        const [pageResult, summaryResult] = await Promise.all([
          loadInventoryPage({
            search: serverQuery,
            category,
            threshold,
            onlyLow,
            page,
            pageSize,
          }),
          cachedSummary ? Promise.resolve(cachedSummary) : loadInventorySummary(threshold),
        ]);

        if (requestId !== loadRequestRef.current) return;

        setRows(pageResult.items);
        setTotalCount(pageResult.totalCount);
        setProductCountOnPage(pageResult.productCountOnPage);
        setPaginationMode(pageResult.paginationMode);
        summaryCacheRef.current.set(threshold, summaryResult);
        setSummary(summaryResult);
        setError("");
        setMovementVersion((current) => current + 1);
        hasLoadedRef.current = true;

        if (manual) toast.success("Inventory refreshed from Supabase.");
      } catch (cause) {
        if (requestId !== loadRequestRef.current) return;
        const message = cause instanceof Error ? cause.message : "Unable to load inventory.";
        setError(message);
        setMovementLoading(false);
        if (manual) toast.error(message);
      } finally {
        if (requestId === loadRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [serverQuery, category, threshold, onlyLow, page, pageSize],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useDashboardRealtimeRefresh(["store_product_variants"], () => {
    summaryCacheRef.current.clear();
    void load(false);
  });

  useEffect(() => {
    let active = true;
    void loadInventoryCategoryOptions()
      .then((next) => {
        if (active) setCategories(next);
      })
      .catch((cause) => {
        console.warn(
          "[dashboard-inventory] category options failed",
          cause instanceof Error ? cause.message : cause,
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setServerQuery(query.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = totalCount ? (safePage - 1) * pageSize : 0;
  const pageEnd = Math.min(
    pageStart + (paginationMode === "products" ? productCountOnPage : rows.length),
    totalCount,
  );
  const pageRows = rows;
  const pageVariantKey = pageRows.map((row) => row.variantId).join(",");

  useEffect(() => {
    if (hasLoadedRef.current && !loading && page !== safePage) setPage(safePage);
  }, [loading, page, safePage, setPage]);

  useEffect(() => {
    const variantIds = pageVariantKey ? pageVariantKey.split(",") : [];
    const requestId = ++movementRequestRef.current;

    if (!variantIds.length) {
      setMovementLoading(false);
      return;
    }

    setMovementLoading(true);
    void loadInventoryLatestMovements(variantIds)
      .then((movements) => {
        if (requestId !== movementRequestRef.current) return;
        const latestByVariant = new Map(
          movements.map((movement) => [movement.variantId, movement]),
        );
        setRows((current) =>
          current.map((row) => {
            const movement = latestByVariant.get(row.variantId);
            return movement
              ? {
                  ...row,
                  lastMovementAt: movement.createdAt,
                  lastMovementDelta: movement.quantityDelta,
                }
              : row;
          }),
        );
      })
      .catch((cause) => {
        console.warn(
          "[dashboard-inventory] paged movement hydration failed",
          cause instanceof Error ? cause.message : cause,
        );
      })
      .finally(() => {
        if (requestId === movementRequestRef.current) setMovementLoading(false);
      });
  }, [pageVariantKey, movementVersion]);

  const activeFilterCount = Number(Boolean(query.trim())) + Number(category !== "all") + Number(onlyLow) + Number(threshold !== 10);
  const totalUnits = summary.totalUnits;
  const low = summary.lowCount;
  const out = summary.outCount;

  const replaceRowStock = (variantId: string, stock: number, delta: number) => {
    summaryCacheRef.current.clear();
    setRows((current) =>
      current.map((row) =>
        row.variantId === variantId
          ? {
              ...row,
              stock,
              lastMovementAt: delta === 0 ? row.lastMovementAt : new Date().toISOString(),
              lastMovementDelta: delta === 0 ? row.lastMovementDelta : delta,
            }
          : row,
      ),
    );
    setDraftStocks((current) => {
      const next = { ...current };
      delete next[variantId];
      return next;
    });
  };

  const changeBy = async (row: InventoryRow, delta: number) => {
    if (!row.trackInventory || savingId) return;
    if (row.stock + delta < 0) return;
    setSavingId(row.variantId);
    try {
      const newStock = await adjustInventoryDelta(
        row,
        delta,
        `Inventory dashboard ${delta > 0 ? "increase" : "decrease"}`,
      );
      replaceRowStock(row.variantId, newStock, delta);
      toast.success(`${row.productName} stock updated to ${newStock}.`);
      void load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Inventory adjustment failed.");
    } finally {
      setSavingId(null);
    }
  };

  const commitAbsolute = async (row: InventoryRow) => {
    if (!row.trackInventory || savingId) return;
    const raw = draftStocks[row.variantId];
    if (raw == null) return;

    const nextStock = Number(raw);
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      toast.error("Stock must be a non-negative whole number.");
      setDraftStocks((current) => ({ ...current, [row.variantId]: String(row.stock) }));
      return;
    }

    if (nextStock === row.stock) {
      setDraftStocks((current) => {
        const next = { ...current };
        delete next[row.variantId];
        return next;
      });
      return;
    }

    setSavingId(row.variantId);
    try {
      const snapshot = draftSnapshots.current.get(row.variantId) ?? row;
      const newStock = await setInventoryStock(
        snapshot,
        nextStock,
        "Inventory dashboard manual stock set",
      );
      replaceRowStock(row.variantId, newStock, newStock - row.stock);
      toast.success(`${row.productName} stock updated to ${newStock}.`);
      void load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Inventory update failed.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (error && !rows.length) {
    return (
      <div>
        <h1 className="mb-5 text-2xl font-bold">{t("Inventory control")}</h1>
        <DashboardLoadError message={error} busy={refreshing} onRetry={() => void load(true)} />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <DashboardLoadError message={error} busy={refreshing} onRetry={() => void load(true)} />
      )}
      <div className="dashboard-page-header mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <PageTitle
            eyebrow="Commerce / Operations"
            title="Inventory control"
            description="Live variant inventory from Supabase. Every stock change is recorded as an inventory movement."
          />
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="dashboard-button flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("Refresh inventory")}
        </button>
      </div>

      <DashboardListViews
        scope="inventory"
        keys={["category", "onlyLow", "threshold", "pageSize", "attention"]}
        presets={[
          { name: "Low stock", query: "onlyLow=1&threshold=10" },
          { name: "Out of stock", query: "onlyLow=1&threshold=0&attention=out" },
        ]}
      />

      <div className="dashboard-summary-grid mb-3 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="dashboard-metric-card rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="text-xs text-slate-500">{t("Total units")}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{totalUnits}</div>
          <div className="mt-1 text-[10px] text-slate-400">
            {summary.variantCount} {t("variants")}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800/50 dark:bg-amber-950/30 sm:p-4">
          <div className="text-xs text-amber-800 dark:text-amber-200">{t("Low stock variants")}</div>
          <div className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{low}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-800/50 dark:bg-rose-950/30 sm:p-4">
          <div className="text-xs text-rose-800 dark:text-rose-200">{t("Out of stock variants")}</div>
          <div className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-200">{out}</div>
        </div>
      </div>

      <div className="dashboard-inventory-stock-tabs mb-2 flex flex-wrap items-center gap-2" role="group" aria-label={t("Inventory stock views")}>
        {[
          { label: "All stock", selected: !onlyLow, low: false, limit: 10 },
          { label: "Low stock", selected: onlyLow && threshold > 0, low: true, limit: 10 },
          { label: "Out of stock", selected: onlyLow && threshold === 0, low: true, limit: 0 },
        ].map((view) => (
          <button
            key={view.label}
            type="button"
            aria-pressed={view.selected}
            onClick={() => {
              setOnlyLow(view.low);
              setThreshold(view.limit);
              setPage(1);
            }}
            className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              view.selected
                ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-100"
                : "border-border bg-card text-foreground hover:bg-muted/60"
            }`}
          >
            {t(view.label)}
          </button>
        ))}
      </div>
      <div className="dashboard-filter-panel dashboard-inventory-toolbar mb-3 rounded-xl border border-border bg-card p-3 sm:p-3.5">
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder={t("Search product, variant, SKU, barcode, or brand")}
                aria-label={t("Search product, variant, SKU, barcode, or brand")}
                className="h-11 w-full rounded-lg border border-border bg-background ps-10 pe-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
              />
              {query && (
                <button type="button" aria-label={t("Clear inventory search")}
                  title={t("Clear inventory search")}
                  onClick={() => { setQuery(""); setPage(1); }}
                  className="absolute end-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-600">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
              aria-label={t("Advanced inventory filters")}
            >
              <SlidersHorizontal className="size-5" />
            </button>
          </div>
          <div className={`${filtersOpen ? "flex" : "hidden"} flex-wrap items-center gap-2 lg:flex`}>
            <select
              value={category}
              onChange={(event) => { setCategory(event.target.value); setPage(1); }}
              aria-label={t("All categories")}
              className="h-11 min-w-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 sm:flex-none"
            >
              <option value="all">{t("All categories")}</option>
              {categories.items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
              {categories.hasUncategorized && (
                <option value="uncategorized">{t("Uncategorized")}</option>
              )}
            </select>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
              <SlidersHorizontal className="size-4" />
              {t("Low ≤")}
              <input
                value={threshold}
                onChange={(event) => { setThreshold(Math.max(0, Number(event.target.value) || 0)); setPage(1); }}
                type="number"
                min={0}
                aria-label={t("Low stock threshold")}
                className="w-14 bg-transparent text-sm outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => { setOnlyLow((current) => !current); setPage(1); }}
              aria-pressed={onlyLow}
              className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
                onlyLow ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Filter className="size-4" />
              {t("Low stock only")}
            </button>
            <button
              type="button"
              onClick={() => { setQuery(""); setCategory("all"); setOnlyLow(false); setThreshold(10); setPage(1); }}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {t("Reset filters")}
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-catalog-panel overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div>
            <div className="text-[15px] font-bold text-[#14203a]">{t("Inventory products")}</div>
            <div className="mt-1 text-[10px] text-slate-400">
              {t(paginationMode === "products" ? "All variants are included in each product group." : "Products are grouped by ID. Counts apply to variants on this page.")}
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            {totalCount ? `${pageStart + 1}–${pageEnd} of ${totalCount}` : t("0 shown")}
          </span>
        </div>

        <InventoryGroupedList
          rows={pageRows}
          completeGroups={paginationMode === "products"}
          threshold={threshold}
          savingId={savingId}
          draftStocks={draftStocks}
          movementLoading={movementLoading}
          onDraftChange={(id, value) =>
            setDraftStocks((current) => ({ ...current, [id]: value }))
          }
          onCommit={(row) => void commitAbsolute(row)}
          onChangeBy={(row, delta) => void changeBy(row, delta)}
          onHistory={(row) => setHistoryRow(row)}
        />
        {!totalCount && (
          <div className="p-12 text-center text-sm text-slate-400">
            <Boxes className="mx-auto mb-3 size-8 text-slate-300" />
            {t("No inventory variants match these filters.")}
          </div>
        )}

        {totalCount > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#fcfcfe] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <span className="text-xs font-semibold text-slate-500">
                {t("Showing")} {pageStart + 1}–{pageEnd} {t("of")} {totalCount} {t(paginationMode === "products" ? "products" : "variants")}
              </span>
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                {t("Per page")}
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                  aria-label={t("Inventory rows per page")}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <nav
              className="flex items-center justify-center gap-1"
              aria-label={t("Inventory pagination")}
            >
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={t("Previous inventory page")}
              >
                <ChevronLeft className="size-4" />
              </button>

              {paginationItems(safePage, totalPages).map((item) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-current={item === safePage ? "page" : undefined}
                    className={`min-w-9 rounded-lg border px-2 py-2 text-[11px] font-bold transition ${
                      item === safePage
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-border bg-card text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span
                    key={item}
                    className="grid size-9 place-items-center text-[11px] text-slate-400"
                  >
                    …
                  </span>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={t("Next inventory page")}
              >
                <ChevronRight className="size-4" />
              </button>
            </nav>
          </div>
        )}
      </div>

      <InventoryMovementHistoryDrawer
        row={historyRow}
        open={Boolean(historyRow)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setHistoryRow(null);
        }}
      />
    </div>
  );
}
