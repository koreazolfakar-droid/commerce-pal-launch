import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import InventoryMovementHistoryDrawer from "@/dashboard/components/inventory/InventoryMovementHistoryDrawer";
import {
  adjustInventoryDelta,
  loadInventoryLatestMovements,
  loadInventoryWorkspace,
  setInventoryStock,
  type InventoryRow,
} from "@/dashboard/data/inventory";

type InventoryStatus = "In stock" | "Low stock" | "Out of stock" | "Not tracked";

function statusFor(stock: number, threshold: number, tracked: boolean): InventoryStatus {
  if (!tracked) return "Not tracked";
  if (stock <= 0) return "Out of stock";
  if (stock <= threshold) return "Low stock";
  return "In stock";
}

function Badge({ status }: { status: InventoryStatus }) {
  const styles =
    status === "In stock"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Low stock"
        ? "bg-amber-50 text-amber-700"
        : status === "Out of stock"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-500";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}>{status}</span>;
}

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

function movementLabel(row: InventoryRow, loading: boolean) {
  if (!row.lastMovementAt || row.lastMovementDelta == null) return loading ? "Loading…" : "—";
  const prefix = row.lastMovementDelta > 0 ? "+" : "";
  return `${prefix}${row.lastMovementDelta} · ${new Date(row.lastMovementAt).toLocaleString()}`;
}

export default function InventoryManagerPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [threshold, setThreshold] = useState(10);
  const [onlyLow, setOnlyLow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movementLoading, setMovementLoading] = useState(false);
  const loadRequestRef = useRef(0);
  const movementRequestRef = useRef(0);
  const [movementVersion, setMovementVersion] = useState(0);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftStocks, setDraftStocks] = useState<Record<string, string>>({});
  const [historyRow, setHistoryRow] = useState<InventoryRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async (manual = false) => {
    const requestId = ++loadRequestRef.current;
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      const next = await loadInventoryWorkspace();
      if (requestId !== loadRequestRef.current) return;

      setRows(next);
      setDraftStocks({});
      setError("");
      setMovementVersion((current) => current + 1);

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
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    let hasUncategorized = false;
    for (const row of rows) {
      if (row.categoryId) map.set(row.categoryId, row.category || "Unnamed category");
      else hasUncategorized = true;
    }
    return {
      items: [...map.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      hasUncategorized,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !needle ||
        [
          row.productName,
          row.variantTitle,
          row.optionsLabel,
          row.sku,
          row.barcode,
          row.brand,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      const matchesCategory =
        category === "all" ||
        (category === "uncategorized" ? !row.categoryId : row.categoryId === category);
      const status = statusFor(row.stock, threshold, row.trackInventory);
      return (
        matchesQuery &&
        matchesCategory &&
        (!onlyLow || status === "Low stock" || status === "Out of stock")
      );
    });
  }, [rows, query, category, threshold, onlyLow]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filtered.length ? (safePage - 1) * pageSize : 0;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageRows = useMemo(
    () => filtered.slice(pageStart, pageEnd),
    [filtered, pageStart, pageEnd],
  );
  const pageVariantKey = pageRows.map((row) => row.variantId).join(",");

  useEffect(() => {
    setPage(1);
  }, [query, category, threshold, onlyLow, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    const variantIds = pageVariantKey ? pageVariantKey.split(",") : [];
    const requestId = ++movementRequestRef.current;

    if (!variantIds.length) {
      setMovementLoading(false);
      return;
    }

    setMovementLoading(true);
    void loadInventoryLatestMovements(variantIds, Math.max(100, variantIds.length * 20))
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

  const totalUnits = rows.reduce((sum, row) => sum + row.stock, 0);
  const low = rows.filter(
    (row) => statusFor(row.stock, threshold, row.trackInventory) === "Low stock",
  ).length;
  const out = rows.filter(
    (row) => statusFor(row.stock, threshold, row.trackInventory) === "Out of stock",
  ).length;

  const replaceRowStock = (variantId: string, stock: number, delta: number) => {
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
      const newStock = await setInventoryStock(row, nextStock, "Inventory dashboard manual stock set");
      replaceRowStock(row.variantId, newStock, newStock - row.stock);
      toast.success(`${row.productName} stock updated to ${newStock}.`);
    } catch (cause) {
      setDraftStocks((current) => ({ ...current, [row.variantId]: String(row.stock) }));
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
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Operations
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            Inventory control
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Live variant inventory from Supabase. Every stock change is recorded as an inventory movement.
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh inventory
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] text-slate-400">Total units</div>
          <div className="mt-1 text-2xl font-bold text-[#14203a]">{totalUnits}</div>
          <div className="mt-1 text-[10px] text-slate-400">{rows.length} variants</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="text-[11px] text-amber-700/70">Low stock variants</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{low}</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
          <div className="text-[11px] text-rose-700/70">Out of stock variants</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{out}</div>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, variant, SKU, barcode, or brand"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[11px] outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
            >
              <option value="all">All categories</option>
              {categories.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              {categories.hasUncategorized && <option value="uncategorized">Uncategorized</option>}
            </select>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600">
              <SlidersHorizontal className="size-3.5" />
              Low ≤
              <input
                value={threshold}
                onChange={(event) => setThreshold(Math.max(0, Number(event.target.value) || 0))}
                type="number"
                min={0}
                className="w-12 border-0 p-0 text-[11px] outline-none"
              />
            </label>
            <button
              onClick={() => setOnlyLow((current) => !current)}
              className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-[11px] font-bold ${
                onlyLow
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <Filter className="size-3.5" />
              Low stock only
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div>
            <div className="text-[15px] font-bold text-[#14203a]">Inventory variants</div>
            <div className="mt-1 text-[10px] text-slate-400">Products, variants, and live stock controls</div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            {filtered.length ? `${pageStart + 1}–${pageEnd} of ${filtered.length}` : "0 shown"}
          </span>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">
          {pageRows.map((row) => {
            const status = statusFor(row.stock, threshold, row.trackInventory);
            const saving = savingId === row.variantId;
            return (
              <article key={row.variantId} className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {row.image ? (
                      <img
                        src={row.image}
                        alt={row.productName}
                        loading="lazy"
                        className="size-full object-contain p-1"
                      />
                    ) : (
                      <Package className="size-5 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-[13px] font-extrabold leading-[1.35] text-slate-800">
                          {row.productName}
                        </h3>
                        <div className="mt-1 truncate text-[10px] font-medium text-slate-400">
                          {row.brand || "No brand"} · {row.variantTitle || "Default"}
                        </div>
                      </div>
                      <Badge status={status} />
                    </div>

                    {row.optionsLabel && (
                      <div className="mt-1.5 line-clamp-1 text-[10px] text-slate-500">
                        {row.optionsLabel}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">SKU</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] font-semibold text-slate-600">
                      {row.sku || "—"}
                    </div>
                  </div>
                  <div className="min-w-[78px] rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">On hand</div>
                    <div className="mt-0.5 text-[18px] font-black leading-none text-slate-800">{row.stock}</div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                  <button
                    onClick={() => void changeBy(row, -1)}
                    disabled={saving || !row.trackInventory || row.stock <= 0}
                    className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Decrease stock for ${row.productName}`}
                  >
                    <Minus className="size-4" />
                  </button>
                  <input
                    value={draftStocks[row.variantId] ?? String(row.stock)}
                    onChange={(event) =>
                      setDraftStocks((current) => ({
                        ...current,
                        [row.variantId]: event.target.value,
                      }))
                    }
                    onBlur={() => void commitAbsolute(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    disabled={saving || !row.trackInventory}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-center text-[14px] font-black text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    aria-label={`Set stock for ${row.productName}`}
                  />
                  <button
                    onClick={() => void changeBy(row, 1)}
                    disabled={saving || !row.trackInventory}
                    className="grid size-10 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Increase stock for ${row.productName}`}
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setHistoryRow(row)}
                  className="mt-2 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[9px] leading-4 text-slate-500 transition hover:bg-slate-50 active:scale-[.99]"
                  aria-label={`View inventory history for ${row.productName} ${row.variantTitle}`}
                >
                  <History className="size-3.5 shrink-0 text-indigo-500" />
                  <span className="min-w-0 flex-1 truncate">
                    Last movement: {movementLabel(row, movementLoading)}
                  </span>
                  <span className="shrink-0 font-bold text-indigo-600">History</span>
                </button>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="bg-[#fafbfe]">
              <tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400">
                <th className="px-5 py-3">Item</th>
                <th className="px-3 py-3">Variant</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Stock control</th>
                <th className="px-3 py-3">On hand</th>
                <th className="px-3 py-3">Last movement</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const status = statusFor(row.stock, threshold, row.trackInventory);
                const saving = savingId === row.variantId;
                return (
                  <tr key={row.variantId} className="border-b border-slate-50 hover:bg-[#fafbff]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                          {row.image ? (
                            <img
                              src={row.image}
                              alt={row.productName}
                              loading="lazy"
                              className="size-full object-contain p-1"
                            />
                          ) : (
                            <Package className="size-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="max-w-[280px] truncate text-[13px] font-extrabold text-slate-800">
                            {row.productName}
                          </div>
                          <div className="mt-1.5 text-[10px] font-medium text-slate-400">
                            {row.brand || "No brand"} · {row.productStatus}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="max-w-[220px] text-[12px] font-bold text-slate-700">
                        {row.variantTitle || "Default"}
                      </div>
                      {row.optionsLabel && (
                        <div className="mt-1 max-w-[220px] truncate text-[9px] text-slate-400">
                          {row.optionsLabel}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                        {row.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[10px] text-slate-500">
                      {row.sku || "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => void changeBy(row, -1)}
                          disabled={saving || !row.trackInventory || row.stock <= 0}
                          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Decrease stock for ${row.productName}`}
                        >
                          <Minus className="size-3" />
                        </button>
                        <input
                          value={draftStocks[row.variantId] ?? String(row.stock)}
                          onChange={(event) =>
                            setDraftStocks((current) => ({
                              ...current,
                              [row.variantId]: event.target.value,
                            }))
                          }
                          onBlur={() => void commitAbsolute(row)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          disabled={saving || !row.trackInventory}
                          className="h-9 w-[72px] rounded-xl border border-slate-200 text-center text-[13px] font-black text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
                          type="number"
                          min={0}
                          step={1}
                        />
                        <button
                          onClick={() => void changeBy(row, 1)}
                          disabled={saving || !row.trackInventory}
                          className="grid size-9 place-items-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Increase stock for ${row.productName}`}
                        >
                          {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-4"><span className="inline-flex min-w-12 items-center justify-center rounded-xl bg-slate-100 px-2.5 py-1.5 text-[14px] font-black text-slate-800">{row.stock}</span></td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => setHistoryRow(row)}
                        className="flex max-w-[230px] items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-[9px] leading-4 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-700"
                        aria-label={`View inventory history for ${row.productName} ${row.variantTitle}`}
                      >
                        <History className="mt-0.5 size-3 shrink-0" />
                        <span>
                          <span className="block">{movementLabel(row, movementLoading)}</span>
                          <span className="font-bold text-indigo-600">View history</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="p-12 text-center text-sm text-slate-400">
            <Boxes className="mx-auto mb-3 size-8 text-slate-300" />
            No inventory variants match these filters.
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#fcfcfe] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <span className="text-[10px] font-semibold text-slate-500">
                Showing {pageStart + 1}–{pageEnd} of {filtered.length}
              </span>
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                Per page
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                  aria-label="Inventory rows per page"
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={60}>60</option>
                </select>
              </label>
            </div>

            <nav className="flex items-center justify-center gap-1" aria-label="Inventory pagination">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous inventory page"
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
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="grid size-9 place-items-center text-[11px] text-slate-400">
                    …
                  </span>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next inventory page"
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
