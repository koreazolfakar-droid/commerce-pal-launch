import {
  AlertCircle,
  History,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
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
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function formatActor(value: string | null) {
  if (!value) return "System";
  return "Staff · " + value.slice(0, 8) + "…";
}

function MovementSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-28 rounded bg-slate-100" />
        <div className="h-7 w-12 rounded-lg bg-slate-100" />
      </div>
      <div className="mt-3 h-3 w-3/4 rounded bg-slate-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
    </div>
  );
}

function MovementCard({ movement }: { movement: DashboardInventoryMovement }) {
  const positive = movement.quantityDelta > 0;
  const neutral = movement.quantityDelta === 0;
  const deltaClass = neutral
    ? "bg-slate-100 text-slate-600"
    : positive
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-700";
  const delta = positive ? "+" + movement.quantityDelta : String(movement.quantityDelta);

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_6px_18px_rgba(33,47,82,.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold text-slate-700">
            {movementName(movement.movementType)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {new Date(movement.createdAt).toLocaleString()}
          </div>
        </div>
        <span
          className={
            "inline-flex min-w-12 items-center justify-center rounded-xl px-2.5 py-1.5 text-[12px] font-black " +
            deltaClass
          }
        >
          {delta}
        </span>
      </div>

      {movement.note ? (
        <p className="mt-3 break-words text-[11px] leading-5 text-slate-600">{movement.note}</p>
      ) : null}

      <div className="mt-3 grid gap-2 text-[9px] text-slate-400 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="font-bold uppercase tracking-[.12em] text-slate-400">Actor</div>
          <div className="mt-1 truncate font-semibold text-slate-600">
            {formatActor(movement.createdBy)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="font-bold uppercase tracking-[.12em] text-slate-400">Reference</div>
          <div className="mt-1 truncate font-semibold text-slate-600">
            {movement.referenceType
              ? displayReferenceName(movement.referenceType) +
                (movement.referenceId ? " · " + movement.referenceId : "")
              : "Manual / none"}
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
    [createdSince, debouncedSearch, movementType, referenceType, row],
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-none overflow-hidden p-0 sm:w-[560px] sm:max-w-[92vw]"
      >
        <div className="flex h-full min-h-0 flex-col bg-[#f7f9fc]">
          <SheetHeader className="border-b border-slate-100 bg-white px-5 py-5 pr-14 text-left">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-indigo-500">
              <History className="size-3.5" />
              Inventory history
            </div>
            <SheetTitle className="truncate text-[18px] font-extrabold tracking-[-.025em] text-[#14203a]">
              {row?.productName ?? "Movement history"}
            </SheetTitle>
            <SheetDescription className="text-[11px] leading-5 text-slate-500">
              {row
                ? (row.variantTitle || "Default variant") +
                  (row.sku ? " · SKU " + row.sku : "") +
                  " · " +
                  row.stock +
                  " on hand"
                : "Inventory movement history"}
            </SheetDescription>
          </SheetHeader>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
            aria-live="polite"
            aria-busy={loading || loadingMore}
          >
            <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
                    History filters
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-400">
                    Applied directly in Supabase before pagination
                  </div>
                </div>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="min-h-9 shrink-0 rounded-xl px-3 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Search reference ID or note"
                  aria-label="Search inventory movement history"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-[11px] font-semibold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                    }}
                    aria-label="Clear inventory movement history search"
                    className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <select
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value as MovementTypeFilter)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                  aria-label="Filter inventory movement history by type"
                >
                  <option value="all">All movement types</option>
                  {INVENTORY_MOVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {movementName(type)}
                    </option>
                  ))}
                </select>
                <select
                  value={referenceType}
                  onChange={(event) =>
                    setReferenceType(event.target.value as ReferenceTypeFilter)
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                  aria-label="Filter inventory movement history by source"
                >
                  <option value="all">All sources</option>
                  {INVENTORY_REFERENCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {referenceName(type)}
                    </option>
                  ))}
                </select>
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as MovementPeriod)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                  aria-label="Filter inventory movement history by date range"
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3" aria-label="Loading movement history">
                {Array.from({ length: 5 }, (_, index) => (
                  <MovementSkeleton key={index} />
                ))}
              </div>
            ) : error && !items.length ? (
              <div className="grid min-h-[300px] place-items-center">
                <div className="max-w-sm text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                    <AlertCircle className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-bold text-slate-700">
                    Movement history could not be loaded
                  </div>
                  <p className="mt-2 break-words text-[11px] leading-5 text-slate-500">{error}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </button>
                </div>
              </div>
            ) : !items.length ? (
              <div className="grid min-h-[300px] place-items-center">
                <div className="max-w-xs text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <History className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-bold text-slate-700">
                    {movementType === "all" &&
                    referenceType === "all" &&
                    period === "all" &&
                    !debouncedSearch
                      ? "No inventory movements yet"
                      : "No movements match these filters"}
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {movementType === "all" &&
                    referenceType === "all" &&
                    period === "all" &&
                    !debouncedSearch
                      ? "Stock changes for this variant will appear here automatically."
                      : "Try clearing the search or using a broader movement type, source, or time range."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((movement) => (
                  <MovementCard key={movement.id} movement={movement} />
                ))}

                {error ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[10px] text-rose-700">
                    <div className="font-bold">Could not load more movements.</div>
                    <div className="mt-1 break-words opacity-80">{error}</div>
                    <button
                      type="button"
                      onClick={retry}
                      disabled={loadingMore}
                      className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-3 font-bold shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={"size-3 " + (loadingMore ? "animate-spin" : "")} />
                      Retry
                    </button>
                  </div>
                ) : null}

                {hasMore && !error ? (
                  <button
                    type="button"
                    onClick={() => void loadPage(page + 1, true)}
                    disabled={loadingMore}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                    {loadingMore ? "Loading more…" : "Load more"}
                  </button>
                ) : null}

                {!hasMore && !error ? (
                  <div className="py-2 text-center text-[9px] font-semibold text-slate-400">
                    End of movement history
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
