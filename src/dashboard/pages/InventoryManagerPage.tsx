import DashboardLoadError from "@/dashboard/components/DashboardLoadError";
import DashboardListViews from "@/dashboard/components/layout/DashboardListViews";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { useLocation, useSearch } from "wouter";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import {
  Boxes,
  Package,
  PackageX,
  TriangleAlert,
  ClipboardList,
  Download,
  Layers3,
  ChevronLeft,
  ChevronRight,
  ListChecks,
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
import InventoryCycleCount from "@/dashboard/components/inventory/InventoryCycleCount";
import InventoryAdjustment from "@/dashboard/components/inventory/InventoryAdjustment";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import "@/dashboard/components/inventory/inventory-control.css";
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
  const { t, lang } = useLanguage();
  const [path, navigate] = useLocation();
  const urlSearch = useSearch();
  const attention = new URLSearchParams(urlSearch).get("attention");
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [query, setQuery] = useDashboardQueryState<string>("search", "");
  const [serverQuery, setServerQuery] = useState(query.trim());
  const [category, setCategory] = useDashboardQueryState<string>("category", "all");
  const [threshold, setThreshold] = useDashboardQueryState<number>("threshold", 10);
  const [onlyLow] = useDashboardQueryState<boolean>(
    "onlyLow",
    attention === "low" || attention === "out",
  );
  const outOnly = onlyLow && (attention === "out" || threshold === 0);
  const stockLimit = outOnly ? 0 : threshold;
  const searchInput = useRef<HTMLInputElement>(null);
  const selectionButton = useRef<HTMLButtonElement>(null);
  const [showOtherVariants, setShowOtherVariants] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [adjustmentRow, setAdjustmentRow] = useState<InventoryRow | null>(null);
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
  const [countRows, setCountRows] = useState<InventoryRow[] | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
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
  // React state disables controls on the next render; this lock also blocks same-tick repeats.
  const savingRef = useRef(false);
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
  const pendingDraftCount = Object.entries(draftStocks).filter(
    ([id, value]) =>
      value !==
      String(
        draftSnapshots.current.get(id)?.stock ?? rows.find((row) => row.variantId === id)?.stock,
      ),
  ).length;
  const inventoryDirty = pendingDraftCount > 0;
  useDashboardUnsavedChanges(inventoryDirty);
  const [historyRow, setHistoryRow] = useState<InventoryRow | null>(null);
  const [page, setPage] = useDashboardQueryState<number>("page", 1);
  const [pageSize, setPageSize] = useDashboardQueryState<number>("pageSize", 20, [20, 50, 100]);

  const requestKey = JSON.stringify([
    serverQuery,
    category,
    threshold,
    stockLimit,
    onlyLow,
    page,
    pageSize,
  ]);
  const currentPageReady = query.trim() === serverQuery && loadedKey === requestKey;
  useEffect(() => {
    setSelected(new Set());
    setSelecting(false);
  }, [requestKey, showOtherVariants]);
  const load = useCallback(
    async (manual = false) => {
      const requestId = ++loadRequestRef.current;
      if (manual || hasLoadedRef.current) setRefreshing(true);
      else setLoading(true);

      try {
        // Search, category and pagination do not change this threshold summary.
        const cachedSummary = manual ? undefined : summaryCacheRef.current.get(threshold);
        const [pageResult, summaryResult] = await Promise.all([
          loadInventoryPage({
            search: serverQuery,
            category,
            threshold: stockLimit,
            onlyLow,
            page,
            pageSize,
          }),
          cachedSummary ? Promise.resolve(cachedSummary) : loadInventorySummary(threshold),
        ]);

        if (requestId !== loadRequestRef.current) return;

        setLoadedKey(requestKey);
        setUpdatedAt(new Date());
        setRows(pageResult.items);
        setTotalCount(pageResult.totalCount);
        setProductCountOnPage(pageResult.productCountOnPage);
        setPaginationMode(pageResult.paginationMode);
        summaryCacheRef.current.set(threshold, summaryResult);
        setSummary(summaryResult);
        setError("");
        setMovementVersion((current) => current + 1);
        hasLoadedRef.current = true;

        if (manual) toast.success(t("Inventory refreshed."));
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
    [serverQuery, category, threshold, stockLimit, onlyLow, page, pageSize, requestKey, t],
  );

  useEffect(() => {
    void load(false);
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);

  const refreshBalances = () => {
    summaryCacheRef.current.clear();
    void load(false);
  };
  useDashboardRealtimeRefresh(["store_product_variants"], refreshBalances);

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
    if (currentPageReady && !loading && page !== safePage) setPage(safePage);
  }, [currentPageReady, loading, page, safePage, setPage]);

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

  const activeFilterCount =
    Number(Boolean(query.trim())) +
    Number(category !== "all") +
    Number(onlyLow) +
    Number(threshold !== 10);
  const number = new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en");
  const catalogBusy = !currentPageReady || refreshing;
  const pageActionsDisabled = catalogBusy || Boolean(error) || Boolean(savingId) || inventoryDirty;
  const showingMatchingVariants = onlyLow && paginationMode === "products" && !showOtherVariants;
  const visibleRows = showingMatchingVariants
    ? rows.filter((row) => row.trackInventory && row.stock <= stockLimit)
    : rows;
  const trackedRows = visibleRows.filter((row) => row.trackInventory);
  const selectedRows = trackedRows.filter((row) => selected.has(row.variantId));
  const normalizedQuery = serverQuery.toLowerCase();
  const exactMatches = new Set(
    visibleRows
      .filter(
        (row) =>
          normalizedQuery &&
          [row.sku, row.barcode].some((identifier) => identifier.toLowerCase() === normalizedQuery),
      )
      .map((row) => row.variantId),
  );

  function applyStockView(view: "all" | "low" | "out") {
    const params = new URLSearchParams(window.location.search);
    params.delete("attention");
    params.delete("onlyLow");
    params.delete("page");
    if (view === "out") params.set("attention", "out");
    if (view === "low") {
      params.set("onlyLow", "1");
      if (threshold === 0) params.delete("threshold");
    }
    setShowOtherVariants(false);
    navigate(`${path}${params.size ? `?${params}` : ""}${window.location.hash}`, {
      replace: true,
    });
  }

  function resetFilters() {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["search", "category", "onlyLow", "threshold", "attention", "page"]) {
      params.delete(key);
    }
    setShowOtherVariants(false);
    navigate(`${path}${params.size ? `?${params}` : ""}${window.location.hash}`, {
      replace: true,
    });
  }

  function clearSearch() {
    setQuery("");
    setServerQuery("");
    searchInput.current?.focus();
  }

  function toggleRows(items: InventoryRow[]) {
    if (pageActionsDisabled || !selecting || !items.length) return;
    setSelected((current) => {
      const next = new Set(current);
      const clear = items.every((row) => current.has(row.variantId));
      for (const row of items) {
        if (clear) next.delete(row.variantId);
        else next.add(row.variantId);
      }
      return next;
    });
  }

  function finishSelection() {
    setSelected(new Set());
    setSelecting(false);
    selectionButton.current?.focus();
  }

  function exportPage(items: InventoryRow[], name: string) {
    downloadCsv(`space-call-inventory-${name}.csv`, [
      [
        "Product",
        "Variant",
        "Variant ID",
        "Brand",
        "Category",
        "SKU",
        "Barcode",
        "Inventory tracking",
        "On hand",
      ].map(t),
      ...items.map((row) => [
        row.productName,
        row.variantTitle,
        row.variantId,
        row.brand,
        row.category,
        row.sku,
        row.barcode,
        t(row.trackInventory ? "Tracked" : "Not tracked"),
        row.trackInventory ? row.stock : "",
      ]),
    ]);
  }

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
    if (!row.trackInventory || savingRef.current) return;
    if (row.stock + delta < 0) return;
    savingRef.current = true;
    setSavingId(row.variantId);
    try {
      const newStock = await adjustInventoryDelta(
        row,
        delta,
        `Inventory dashboard ${delta > 0 ? "increase" : "decrease"}`,
      );
      replaceRowStock(row.variantId, newStock, delta);
      toast.success(
        lang === "ar"
          ? `تم تحديث رصيد ${row.productName} إلى ${newStock}.`
          : `${row.productName} stock updated to ${newStock}.`,
      );
      void load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Inventory adjustment failed.");
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  const commitAbsolute = async (row: InventoryRow) => {
    if (!row.trackInventory || savingRef.current) return;
    const raw = draftStocks[row.variantId];
    if (raw == null) return;

    const nextStock = Number(raw);
    // An empty number input coerces to zero; never turn clearing the field into a stock write.
    if (!raw.trim() || !Number.isSafeInteger(nextStock) || nextStock < 0) {
      toast.error(
        lang === "ar"
          ? "أدخل كمية صحيحة تساوي صفرًا أو أكثر. لم يُحفظ التعديل."
          : "Enter a non-negative whole quantity. Your edit has not been saved.",
      );
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

    savingRef.current = true;
    setSavingId(row.variantId);
    try {
      const snapshot = draftSnapshots.current.get(row.variantId) ?? row;
      const newStock = await setInventoryStock(
        snapshot,
        nextStock,
        "Inventory dashboard manual stock set",
      );
      replaceRowStock(row.variantId, newStock, newStock - row.stock);
      toast.success(
        lang === "ar"
          ? `تم تحديث رصيد ${row.productName} إلى ${newStock}.`
          : `${row.productName} stock updated to ${newStock}.`,
      );
      void load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Inventory update failed.");
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  function discardDraft(id: string) {
    draftSnapshots.current.delete(id);
    setDraftStocks((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label={lang === "ar" ? "جارٍ تحميل المخزون" : "Loading inventory"}
        className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-card"
      >
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  if (error && !rows.length && !countRows && !adjustmentRow) {
    return (
      <div>
        <h1 className="mb-5 text-2xl font-bold">{t("Inventory control")}</h1>
        <DashboardLoadError message={error} busy={refreshing} onRetry={() => void load(true)} />
      </div>
    );
  }

  return (
    <div className="inventory-workspace">
      {error && (
        <DashboardLoadError message={error} busy={refreshing} onRetry={() => void load(true)} />
      )}
      <header className="inventory-header">
        <PageTitle eyebrow="Space Call / Stock operations" title="Inventory control" />
        <div className="inventory-header-actions">
          <button
            type="button"
            className="dashboard-button"
            aria-label={t("Refresh inventory")}
            title={t("Refresh inventory")}
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            className="dashboard-button"
            disabled={pageActionsDisabled || !visibleRows.length}
            onClick={() => exportPage(visibleRows, `page-${page}`)}
          >
            <Download size={16} />
            {t("Export page")}
          </button>
          {!selecting && (
            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              disabled={pageActionsDisabled || !trackedRows.length}
              onClick={() => setCountRows(trackedRows)}
            >
              <ClipboardList size={17} />
              {t("Start cycle count")}
            </button>
          )}
        </div>
      </header>

      <section className="inventory-summary" aria-label={t("Inventory overview")}>
        <div className="inventory-total">
          <span>
            <Boxes size={19} />
            {t("Total units")}
          </span>
          <strong>{number.format(summary.totalUnits)}</strong>
          {updatedAt && (
            <small>
              {t("Updated")}{" "}
              <time dateTime={updatedAt.toISOString()}>
                {updatedAt.toLocaleTimeString(lang === "ar" ? "ar-LB" : "en", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </small>
          )}
        </div>
        <div>
          <span>
            <Layers3 size={18} />
            {t("Inventory variants")}
          </span>
          <strong>{number.format(summary.variantCount)}</strong>
          <small>{t("Across the catalog")}</small>
        </div>
        <div>
          <span>
            <TriangleAlert size={18} className="inventory-low dark:bg-amber-950/30" />
            {t("Low stock")}
          </span>
          <strong>{number.format(summary.lowCount)}</strong>
          <small>
            {threshold > 0 ? (
              <>
                <bdi>
                  {number.format(1)}–{number.format(threshold)}
                </bdi>{" "}
                {t("units")}
              </>
            ) : (
              t("Threshold is zero")
            )}
          </small>
        </div>
        <div>
          <span>
            <PackageX size={18} className="inventory-out dark:bg-rose-950/30" />
            {t("Out of stock")}
          </span>
          <strong>{number.format(summary.outCount)}</strong>
          <small>{t("Tracked variants at zero")}</small>
        </div>
      </section>
      <section className="inventory-register" aria-labelledby="inventory-register-title">
        <div className="inventory-register-heading">
          <h2 id="inventory-register-title">
            <Package size={20} />
            {t("Stock register")}
          </h2>
          <span>
            {totalCount && currentPageReady ? (
              <>
                <bdi>
                  {number.format(pageStart + 1)}–{number.format(pageEnd)}
                </bdi>{" "}
                {t("of")} {number.format(totalCount)}{" "}
                {t(paginationMode === "products" ? "products" : "variants")}
              </>
            ) : currentPageReady ? (
              t("0 shown")
            ) : (
              t("Loading…")
            )}
          </span>
        </div>
        <div className="inventory-stock-tabs" role="group" aria-label={t("Inventory stock views")}>
          {(
            [
              { label: "All stock", selected: !onlyLow, value: "all" },
              { label: "Needs replenishment", selected: onlyLow && !outOnly, value: "low" },
              { label: "Out of stock", selected: outOnly, value: "out" },
            ] as const
          ).map((view) => (
            <button
              key={view.label}
              type="button"
              aria-pressed={view.selected}
              onClick={() => applyStockView(view.value)}
            >
              {t(view.label)}
            </button>
          ))}
        </div>
        <div className="inventory-tools">
          <div className="inventory-search-row">
            <div className="inventory-search">
              <Search size={18} aria-hidden="true" />
              <input
                ref={searchInput}
                value={query}
                maxLength={120}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setServerQuery(event.currentTarget.value.trim());
                  } else if (event.key === "Escape" && query) {
                    event.stopPropagation();
                    clearSearch();
                  }
                }}
                placeholder={t("Name, SKU, or barcode")}
                aria-label={t("Search product, variant, SKU, barcode, or brand")}
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("Clear inventory search")}
                  onClick={clearSearch}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="button"
              className="dashboard-button"
              onClick={() => setFiltersOpen((current) => !current)}
              aria-label={t("Advanced inventory filters")}
              aria-expanded={filtersOpen}
              aria-controls="inventory-filters"
            >
              <SlidersHorizontal size={16} />
              {t("Filters")}
              {(category !== "all" || threshold !== 10) && (
                <span className="inventory-filter-dot" aria-hidden="true" />
              )}
            </button>
            <button
              ref={selectionButton}
              type="button"
              className="dashboard-button inventory-select-start"
              aria-label={t("Select variants")}
              aria-pressed={selecting}
              title={t("Select variants")}
              disabled={!selecting && (pageActionsDisabled || !trackedRows.length)}
              onClick={selecting ? finishSelection : () => setSelecting(true)}
            >
              <ListChecks size={17} /> <span>{t("Select variants")}</span>
            </button>
          </div>
          <div className="inventory-filter-chips">
            {category !== "all" && (
              <button
                type="button"
                onClick={() => setCategory("all")}
                aria-label={t("Remove category filter")}
              >
                {categories.items.find((item) => item.id === category)?.name ??
                  t(category === "uncategorized" ? "Uncategorized" : "Category")}
                <X size={14} />
              </button>
            )}
            {threshold !== 10 && (
              <button
                type="button"
                onClick={() => setThreshold(10)}
                aria-label={t("Reset low stock threshold")}
              >
                {t("Low ≤")} <bdi>{number.format(threshold)}</bdi>
                <X size={14} />
              </button>
            )}
            {onlyLow && paginationMode === "products" && (
              <button
                type="button"
                aria-pressed={showOtherVariants}
                onClick={() => setShowOtherVariants((value) => !value)}
              >
                {t(showOtherVariants ? "Show matching variants" : "Show other variants")}
              </button>
            )}
          </div>
          {filtersOpen && (
            <div id="inventory-filters" className="inventory-filters">
              <div className="inventory-filter-fields">
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                  aria-label={t("All categories")}
                  className="h-11 min-w-0 max-w-full flex-1 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground sm:flex-none"
                >
                  <option value="all">{t("All categories")}</option>
                  {categories.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                  {categories.hasUncategorized && (
                    <option value="uncategorized">{t("Uncategorized")}</option>
                  )}
                </select>
                <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground">
                  <SlidersHorizontal className="size-4" />
                  {t("Low ≤")}
                  <input
                    value={threshold}
                    onChange={(event) => {
                      setThreshold(Math.max(0, Number(event.target.value) || 0));
                      setPage(1);
                    }}
                    type="number"
                    min={0}
                    aria-label={t("Low stock threshold")}
                    className="w-14 bg-transparent text-sm text-foreground outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {t("Reset filters")}
                </button>
              </div>
              <DashboardListViews
                scope="inventory"
                keys={["search", "category", "onlyLow", "threshold", "pageSize", "attention"]}
                presets={[]}
              />
            </div>
          )}
        </div>

        {selecting && (
          <div className="inventory-selection">
            <div role="status">
              <strong>
                {number.format(selectedRows.length)} {t("variants selected")}
              </strong>
              <span>{t("Current page")}</span>
            </div>
            <button
              type="button"
              className="dashboard-button"
              disabled={pageActionsDisabled || !trackedRows.length}
              onClick={() => toggleRows(trackedRows)}
            >
              {t(
                selectedRows.length && selectedRows.length === trackedRows.length
                  ? "Clear selection"
                  : "Select current page",
              )}
            </button>
            <button
              type="button"
              className="dashboard-button"
              disabled={pageActionsDisabled || !selectedRows.length}
              onClick={() => exportPage(selectedRows, "selection")}
            >
              <Download size={16} /> {t("Export selection")}
            </button>
            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              disabled={pageActionsDisabled || !selectedRows.length}
              onClick={() => setCountRows(selectedRows)}
            >
              <ClipboardList size={16} /> {t("Count selection")}
            </button>
            <button
              type="button"
              className="inventory-selection-done"
              onClick={finishSelection}
            >
              {t("Done")}
            </button>
          </div>
        )}
        {inventoryDirty && (
          <div className="inventory-edit-hint">
            <div className="flex flex-wrap items-center gap-2" role="status">
              <span>
                {pendingDraftCount} {lang === "ar" ? "تعديلات لم تُحفظ" : "unsaved quantity edits"}
              </span>
              <button
                type="button"
                disabled={Boolean(savingId)}
                onClick={() => {
                  if (savingRef.current) return;
                  draftSnapshots.current.clear();
                  setDraftStocks({});
                }}
                className="min-h-9 rounded-lg border border-border bg-card px-3 font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
              >
                {lang === "ar" ? "إلغاء التعديلات" : "Discard edits"}
              </button>
            </div>
          </div>
        )}

        <div className="inventory-list" aria-busy={catalogBusy}>
          {paginationMode === "variants" && (
            <p className="inventory-edit-hint">
              {t("Products are grouped by ID. Counts apply to variants on this page.")}
            </p>
          )}
          <div inert={!currentPageReady || Boolean(error) ? true : undefined}>
            <InventoryGroupedList
              rows={visibleRows}
              completeGroups={paginationMode === "products" && !showingMatchingVariants}
              exactMatches={exactMatches}
              selection={selecting ? selected : null}
              threshold={threshold}
              savingId={savingId}
              draftStocks={draftStocks}
              movementLoading={movementLoading}
              onDraftChange={(id, value) =>
                setDraftStocks((current) => ({ ...current, [id]: value }))
              }
              onCommit={(row) => void commitAbsolute(row)}
              onCancelDraft={discardDraft}
              onSelect={toggleRows}
              onAdjust={(row) => setAdjustmentRow(row)}
              onChangeBy={(row, delta) => void changeBy(row, delta)}
              onHistory={(row) => setHistoryRow(row)}
            />
          </div>
          {currentPageReady && !totalCount && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Boxes className="mx-auto mb-3 size-8 text-slate-300" />
              <p>{t("No inventory variants match these filters.")}</p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="dashboard-button mx-auto mt-3"
                  onClick={resetFilters}
                >
                  {t("Reset filters")}
                </button>
              )}
            </div>
          )}

          {totalCount > 0 && (
            <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <span className="text-xs font-semibold text-slate-500">
                  {t("Showing")} {pageStart + 1}–{pageEnd} {t("of")} {totalCount}{" "}
                  {t(paginationMode === "products" ? "products" : "variants")}
                </span>
                <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                  {t("Per page")}
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-blue-500"
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
                  className="grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={t("Previous inventory page")}
                >
                  <ChevronLeft className="size-4 rtl:rotate-180" />
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
                  className="grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={t("Next inventory page")}
                >
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </button>
              </nav>
            </div>
          )}
        </div>
      </section>
      {countRows && (
        <InventoryCycleCount
          rows={countRows}
          onClose={() => setCountRows(null)}
          onPosted={refreshBalances}
        />
      )}
      {adjustmentRow && (
        <InventoryAdjustment
          row={adjustmentRow}
          onClose={() => setAdjustmentRow(null)}
          onSaved={(newStock, previousStock) => {
            replaceRowStock(adjustmentRow.variantId, newStock, newStock - previousStock);
            refreshBalances();
          }}
        />
      )}
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
