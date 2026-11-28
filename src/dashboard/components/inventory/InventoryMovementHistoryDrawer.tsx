import { useLanguage } from "@/dashboard/i18n";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import { AlertCircle, Download, History, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_REFERENCE_TYPES,
  listDashboardInventoryMovements,
  type DashboardInventoryMovement,
  type InventoryMovementType,
  type InventoryReferenceType,
  type InventoryRow,
} from "@/dashboard/data/inventory";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PAGE_SIZE = 25;

type MovementTypeFilter = "all" | InventoryMovementType;
type ReferenceTypeFilter = "all" | InventoryReferenceType;
type MovementPeriod = "all" | "7d" | "30d" | "90d";

const MOVEMENT_PERIOD_DAYS: Record<Exclude<MovementPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function movementCreatedSince(period: MovementPeriod) {
  if (period === "all") return undefined;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - MOVEMENT_PERIOD_DAYS[period]);
  return date.toISOString();
}

function movementName(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function referenceName(value: InventoryReferenceType) {
  if (value === "manual_dashboard") return "Manual dashboard";
  if (value === "variant_manager") return "Variant manager";
  if (value === "order") return "Web order";
  if (value === "receiving") return "Receiving / purchase";
  return "Order cancellation";
}

function displayReferenceName(value: string) {
  if (INVENTORY_REFERENCE_TYPES.includes(value as InventoryReferenceType)) {
    return referenceName(value as InventoryReferenceType);
  }
  return movementName(value);
}

function MovementSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-7 w-12 rounded-lg bg-muted" />
      </div>
      <div className="mt-3 h-3 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

function MovementCard({ movement }: { movement: DashboardInventoryMovement }) {
  const { t, lang } = useLanguage();
  const positive = movement.quantityDelta > 0;
  const neutral = movement.quantityDelta === 0;
  const deltaClass = neutral
    ? "bg-muted text-muted-foreground"
    : positive
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
      : "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200";
  const quantity = movement.quantityDelta.toLocaleString(lang === "ar" ? "ar-LB" : "en");
  const delta = (positive ? "+" : "") + quantity;

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {t(movementName(movement.movementType))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <time dateTime={movement.createdAt}>
              <bdi>
                {new Date(movement.createdAt).toLocaleString(lang === "ar" ? "ar-LB" : "en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </bdi>
            </time>
          </div>
        </div>
        <span
          className={
            "inline-flex min-w-12 items-center justify-center rounded-xl px-2.5 py-1.5 text-sm font-bold " +
            deltaClass
          }
        >
          <bdi>{delta}</bdi>
        </span>
      </div>

      {movement.note ? (
        <p className="mt-3 break-words text-sm leading-5 text-muted-foreground">{movement.note}</p>
      ) : null}

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-xl bg-muted/65 px-3 py-2.5">
          <div className="font-bold uppercase tracking-[.12em] text-muted-foreground">
            {t("Actor")}
          </div>
          <div className="mt-1 break-all font-semibold text-muted-foreground">
            {movement.createdBy ? (
              <>
                {t("Staff")} ·{" "}
                <bdi title={movement.createdBy}>{movement.createdBy.slice(0, 8)}…</bdi>
              </>
            ) : (
              t("System")
            )}
          </div>
        </div>
        <div className="rounded-xl bg-muted/65 px-3 py-2.5">
          <div className="font-bold uppercase tracking-[.12em] text-muted-foreground">
            {t("Reference")}
          </div>
          <div className="mt-1 break-all font-semibold text-muted-foreground">
            {movement.referenceType ? (
              <>
                {t(displayReferenceName(movement.referenceType))}
                {movement.referenceId && (
                  <>
                    {" "}
                    · <bdi>{movement.referenceId}</bdi>
                  </>
                )}
              </>
            ) : (
              t("Manual / none")
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function InventoryMovementHistoryDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: InventoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<DashboardInventoryMovement[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [movementType, setMovementType] = useState<MovementTypeFilter>("all");
  const [referenceType, setReferenceType] = useState<ReferenceTypeFilter>("all");
  const [period, setPeriod] = useState<MovementPeriod>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const createdSince = useMemo(() => movementCreatedSince(period), [period]);
  const requestId = useRef(0);
  const currentScope = JSON.stringify([
    row?.variantId,
    movementType,
    referenceType,
    period,
    debouncedSearch,
  ]);
  const [loadedScope, setLoadedScope] = useState("");
  const canExport = Boolean(
    row &&
    items.length &&
    !loading &&
    !loadingMore &&
    currentScope === loadedScope &&
    searchInput === debouncedSearch,
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!row) return;

      const currentRequest = ++requestId.current;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError("");
      }

      try {
        const result = await listDashboardInventoryMovements({
          productId: row.productId,
          variantId: row.variantId,
          movementType: movementType === "all" ? undefined : movementType,
          referenceType: referenceType === "all" ? undefined : referenceType,
          search: debouncedSearch,
          createdSince,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        if (requestId.current !== currentRequest) return;

        setItems((current) => {
          if (!append) return result.items;
          const known = new Set(current.map((movement) => movement.id));
          return [...current, ...result.items.filter((movement) => !known.has(movement.id))];
        });
        setPage(result.page);
        setLoadedScope(currentScope);
        setHasMore(result.hasMore);
        setError("");
      } catch (cause) {
        if (requestId.current !== currentRequest) return;
        setError(cause instanceof Error ? cause.message : "Unable to load movement history.");
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [createdSince, currentScope, debouncedSearch, movementType, referenceType, row],
  );

  useEffect(() => {
    if (!open || !row) {
      requestId.current += 1;
      return;
    }

    setItems([]);
    setPage(1);
    setHasMore(false);
    setError("");
    void loadPage(1, false);

    return () => {
      requestId.current += 1;
    };
  }, [loadPage, open, row]);

  useEffect(() => {
    if (open) return;
    setItems([]);
    setPage(1);
    setHasMore(false);
    setError("");
    setMovementType("all");
    setReferenceType("all");
    setPeriod("all");
    setSearchInput("");
    setDebouncedSearch("");
  }, [open]);

  const retry = () => {
    if (items.length && hasMore) void loadPage(page + 1, true);
    else void loadPage(1, false);
  };

  const resetFilters = () => {
    setMovementType("all");
    setReferenceType("all");
    setPeriod("all");
    setSearchInput("");
    setDebouncedSearch("");
  };

  const filtersActive =
    movementType !== "all" ||
    referenceType !== "all" ||
    period !== "all" ||
    searchInput.trim().length > 0;

  function exportMovements() {
    if (!canExport || !row) return;
    downloadCsv("space-call-inventory-movements.csv", [
      [
        "Product",
        "Variant",
        "SKU",
        "Date",
        "Movement type",
        "Quantity change",
        "Reference",
        "Reference ID",
        "Note",
        "Actor",
      ].map(t),
      ...items.map((entry) => [
        row.productName,
        row.variantTitle,
        row.sku,
        entry.createdAt,
        t(movementName(entry.movementType)),
        entry.quantityDelta,
        entry.referenceType ? t(displayReferenceName(entry.referenceType)) : "",
        entry.referenceId ?? "",
        entry.note ?? "",
        entry.createdBy || t("System"),
      ]),
    ]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={lang === "ar" ? "left" : "right"}
        dir={lang === "ar" ? "rtl" : "ltr"}
        overlayClassName="bg-slate-950/55 backdrop-blur-[2px]"
        className="w-full max-w-none overflow-hidden p-0 sm:w-[560px] sm:max-w-[92vw] [&>button:last-child]:size-11"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <SheetHeader className="border-b border-border bg-card px-5 py-5 pe-14 text-start">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary">
              <History className="size-3.5" />
              {t("Inventory history")}
            </div>
            <SheetTitle className="break-words text-lg font-semibold tracking-[-.025em] text-foreground">
              {row?.productName ?? t("Movement history")}
            </SheetTitle>
            <SheetDescription className="text-sm leading-5 text-muted-foreground">
              {row ? (
                <>
                  <bdi>{row.variantTitle || t("Default variant")}</bdi>
                  {row.sku && (
                    <>
                      {" "}
                      · {t("SKU")} <bdi>{row.sku}</bdi>
                    </>
                  )}
                  {" · "}
                  {t("On hand")}{" "}
                  <bdi>
                    {row.trackInventory
                      ? row.stock.toLocaleString(lang === "ar" ? "ar-LB" : "en")
                      : "—"}
                  </bdi>
                </>
              ) : (
                t("Inventory movement history")
              )}
            </SheetDescription>
          </SheetHeader>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
            aria-live="polite"
            aria-busy={loading || loadingMore}
          >
            <div className="mb-4 rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">
                    {t("History filters")}
                  </div>
                </div>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold text-primary transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {t("Reset")}
                  </button>
                ) : null}
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  maxLength={80}
                  autoComplete="off"
                  placeholder={t("Search reference ID or note")}
                  aria-label={t("Search inventory movement history")}
                  className="h-11 w-full rounded-xl border border-border bg-card ps-9 pe-10 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                    }}
                    aria-label={t("Clear inventory movement history search")}
                    className="absolute end-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <select
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value as MovementTypeFilter)}
                  className="h-11 min-w-0 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-primary"
                  aria-label={t("Filter inventory movement history by type")}
                >
                  <option value="all">{t("All movement types")}</option>
                  {INVENTORY_MOVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(movementName(type))}
                    </option>
                  ))}
                </select>
                <select
                  value={referenceType}
                  onChange={(event) => setReferenceType(event.target.value as ReferenceTypeFilter)}
                  className="h-11 min-w-0 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-primary"
                  aria-label={t("Filter inventory movement history by source")}
                >
                  <option value="all">{t("All sources")}</option>
                  {INVENTORY_REFERENCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(referenceName(type))}
                    </option>
                  ))}
                </select>
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as MovementPeriod)}
                  className="h-11 min-w-0 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-primary"
                  aria-label={t("Filter inventory movement history by date range")}
                >
                  <option value="all">{t("All time")}</option>
                  <option value="7d">{t("Last 7 days")}</option>
                  <option value="30d">{t("Last 30 days")}</option>
                  <option value="90d">{t("Last 90 days")}</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3" aria-label={t("Loading movement history")}>
                {Array.from({ length: 5 }, (_, index) => (
                  <MovementSkeleton key={index} />
                ))}
              </div>
            ) : error && !items.length ? (
              <div className="grid min-h-[300px] place-items-center">
                <div className="max-w-sm text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                    <AlertCircle className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-bold text-foreground">
                    {t("Movement history could not be loaded")}
                  </div>
                  <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
                  >
                    <RefreshCw className="size-3.5" />
                    {t("Retry")}
                  </button>
                </div>
              </div>
            ) : !items.length ? (
              <div className="grid min-h-[300px] place-items-center">
                <div className="max-w-xs text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <History className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-bold text-foreground">
                    {movementType === "all" &&
                    referenceType === "all" &&
                    period === "all" &&
                    !debouncedSearch
                      ? t("No inventory movements yet")
                      : t("No movements match these filters")}
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {movementType === "all" &&
                    referenceType === "all" &&
                    period === "all" &&
                    !debouncedSearch
                      ? t("Stock changes for this variant will appear here automatically.")
                      : t(
                          "Try clearing the search or using a broader movement type, source, or time range.",
                        )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    <bdi>{items.length.toLocaleString(lang === "ar" ? "ar-LB" : "en")}</bdi>{" "}
                    {t("movements loaded")}
                  </span>
                  <button
                    type="button"
                    className="dashboard-button min-h-11"
                    disabled={!canExport}
                    onClick={exportMovements}
                  >
                    <Download size={16} /> {t("Export loaded movements")}
                  </button>
                </div>
                {items.map((movement) => (
                  <MovementCard key={movement.id} movement={movement} />
                ))}

                {error ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                    <div className="font-bold">{t("Could not load more movements.")}</div>
                    <div className="mt-1 break-words opacity-80">{error}</div>
                    <button
                      type="button"
                      onClick={retry}
                      disabled={loadingMore}
                      className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-xl bg-card px-3 font-bold shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={"size-3 " + (loadingMore ? "animate-spin" : "")} />
                      {t("Retry")}
                    </button>
                  </div>
                ) : null}

                {hasMore && !error ? (
                  <button
                    type="button"
                    onClick={() => void loadPage(page + 1, true)}
                    disabled={loadingMore}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                    {loadingMore ? t("Loading more…") : t("Load more")}
                  </button>
                ) : null}

                {!hasMore && !error ? (
                  <div className="py-2 text-center text-xs font-semibold text-muted-foreground">
                    {t("End of movement history")}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
