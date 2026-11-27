import { Link } from "wouter";
import { ChevronDown, ChevronUp, Copy, History, Loader2, Minus, Package, Plus, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/dashboard/i18n";
import { toast } from "sonner";
import type { InventoryRow } from "@/dashboard/data/inventory";
import { groupInventoryRows } from "./groupInventoryRows";

type Props = {
  rows: InventoryRow[];
  threshold: number;
  /** True when server pagination includes every variant for a parent product. */
  completeGroups: boolean;
  savingId: string | null;
  draftStocks: Record<string, string>;
  movementLoading: boolean;
  onDraftChange: (id: string, value: string) => void;
  onCommit: (row: InventoryRow) => void;
  onChangeBy: (row: InventoryRow, delta: number) => void;
  onHistory: (row: InventoryRow) => void;
};

function formatMovement(row: InventoryRow, loading: boolean) {
  if (!row.lastMovementAt || row.lastMovementDelta === null) return loading ? "Loading…" : "—";
  const sign = row.lastMovementDelta > 0 ? "+" : "";
  return `${sign}${row.lastMovementDelta} · ${new Date(row.lastMovementAt).toLocaleString()}`;
}

function VariantStatus({ row, threshold }: { row: InventoryRow; threshold: number }) {
  const { t } = useLanguage();
  const status = !row.trackInventory
    ? "Not tracked"
    : row.stock <= 0
      ? "Out of stock"
      : row.stock <= threshold
        ? "Low stock"
        : "In stock";
  const classes = status === "Out of stock"
    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
    : status === "Low stock"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
      : status === "In stock"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "bg-muted text-muted-foreground";
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{t(status)}</span>;
}

function VariantEditor({
  row,
  savingId,
  draftStocks,
  onDraftChange,
  onCommit,
  onChangeBy,
  onHistory,
  movementLoading,
  threshold,
}: Omit<Props, "rows" | "completeGroups"> & { row: InventoryRow }) {
  const { t } = useLanguage();
  const saving = savingId === row.variantId;
  const blocked = Boolean(savingId) || !row.trackInventory;
  const pendingDraft = draftStocks[row.variantId] !== undefined && draftStocks[row.variantId] !== String(row.stock);
  const quickBlocked = blocked || pendingDraft;
  const label = `${row.productName} — ${row.variantTitle || t("Default")}`;

  return (
    <div className="grid gap-3 border-t border-border px-3 py-3.5 first:border-t-0 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-5">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-sm font-semibold text-foreground">
            {row.variantTitle || t("Default")}
          </span>
          <VariantStatus row={row} threshold={threshold} />
        </div>
        {row.optionsLabel && (
          <p className="break-words text-xs text-muted-foreground">{row.optionsLabel}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex max-w-full items-center gap-1 break-all">
            <span><span className="font-semibold">{t("SKU")}:</span> {row.sku || "—"}</span>
            {row.sku && (
              <button type="button" title={t("Copy SKU")} aria-label={`${t("Copy SKU")}: ${row.sku}`}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-600"
                onClick={() => {
                  void navigator.clipboard.writeText(row.sku)
                    .then(() => toast.success(t("SKU copied")))
                    .catch(() => toast.error(t("Unable to copy SKU")));
                }}>
                <Copy className="size-3.5" />
              </button>
            )}
          </span>
          {row.barcode && <span className="break-all">{t("Barcode")}: {row.barcode}</span>}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="me-auto text-xs font-medium text-muted-foreground lg:me-0">{t("On hand")}</span>
        <button
          type="button"
          onClick={() => onChangeBy(row, -1)}
          disabled={quickBlocked || row.stock <= 0}
          aria-label={`Decrease stock for ${label}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => onChangeBy(row, -5)}
          disabled={quickBlocked || row.stock < 5}
          title={t("Decrease stock by five")}
          aria-label={`${t("Decrease stock by five")}: ${label}`}
          className="grid h-11 min-w-10 shrink-0 place-items-center rounded-lg border border-border bg-card px-1 text-xs font-semibold tabular-nums text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40">
          −5
        </button>
        <input
          value={draftStocks[row.variantId] ?? String(row.stock)}
          onChange={(event) => onDraftChange(row.variantId, event.target.value)}
          onBlur={() => onCommit(row)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          disabled={blocked}
          aria-label={`Set stock for ${label}`}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          className="h-11 w-20 min-w-0 rounded-lg border border-border bg-card text-center text-sm font-bold tabular-nums text-foreground outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:bg-muted disabled:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => onChangeBy(row, 1)}
          disabled={quickBlocked}
          aria-label={`Increase stock for ${label}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </button>
        <button type="button" onClick={() => onChangeBy(row, 5)}
          disabled={quickBlocked}
          title={t("Increase stock by five")}
          aria-label={`${t("Increase stock by five")}: ${label}`}
          className="grid h-11 min-w-10 shrink-0 place-items-center rounded-lg border border-blue-300 bg-blue-50 px-1 text-xs font-semibold tabular-nums text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
          +5
        </button>
      </div>
      <button
        type="button"
        onClick={() => onHistory(row)}
        aria-label={`View inventory history for ${label}`}
        className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-start text-xs text-muted-foreground hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:max-w-52"
      >
        <History className="size-4 shrink-0 text-blue-600" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-blue-700">{t("History")}</span>
          <span className="block break-words text-[11px] leading-4 text-muted-foreground">
            {formatMovement(row, movementLoading)}
          </span>
        </span>
      </button>
    </div>
  );
}

/** Grouped presentation only; stock writes remain scoped to the original variant ID. */
export default function InventoryGroupedList(props: Props) {
  const { t } = useLanguage();
  const groups = useMemo(() => groupInventoryRows(props.rows, props.threshold), [props.rows, props.threshold]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="divide-y divide-slate-100">
      {groups.map((group) => {
        const isOpen = expanded[group.productId] ?? group.variants.length === 1;
        const sectionId = `inventory-product-${group.productId}`;
        return (
          <section key={group.productId} className="bg-card">
            <div className="flex min-w-0 items-center gap-2 p-3 sm:gap-3 sm:px-5 sm:py-3.5">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={sectionId}
                onClick={() => setExpanded((current) => ({ ...current, [group.productId]: !isOpen }))}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted/40 sm:size-14">
                  {group.image ? (
                    <img src={group.image} alt="" loading="lazy" className="size-full object-contain p-1" />
                  ) : (
                    <Package className="size-5 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-bold leading-5 text-foreground">{group.productName}</span>
                  <span className="mt-1 block break-words text-xs text-muted-foreground">
                    {[group.brand, group.category].filter(Boolean).join(" · ") || t("Uncategorized")}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
                      {group.variants.length} {t(props.completeGroups ? "Variants" : "Variants on this page")}
                    </span>
                    {group.outCount > 0 && (
                      <span className="rounded-md bg-rose-50 px-2 py-1 font-semibold text-rose-700">
                        {group.outCount} {t("Out of stock")}
                      </span>
                    )}
                    {group.lowCount > 0 && (
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                        {group.lowCount} {t("Low stock")}
                      </span>
                    )}
                  </span>
                </span>
                <span className="hidden shrink-0 text-end sm:block">
                  <span className="block text-xs text-muted-foreground">{t(props.completeGroups ? "On hand" : "On hand · this page")}</span>
                  <span className="block text-lg font-bold tabular-nums text-foreground">
                    {group.trackedCount ? group.visibleTrackedUnits : "—"}
                  </span>
                </span>
                {isOpen ? <ChevronUp className="size-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-5 shrink-0 text-muted-foreground" />}
              </button>
              <Link
                href={`/dashboard/products/${group.productId}`}
                className="grid size-11 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                aria-label={`${t("Edit product")}: ${group.productName}`}
              >
                <Pencil className="size-4" />
              </Link>
            </div>
            {isOpen && (
              <div id={sectionId} role="region" aria-label={`${group.productName} · ${t("Variants")}`} className="border-t border-border bg-muted/30 ps-2 sm:ps-5">
                <div className="rounded-s-xl bg-card">
                  {group.variants.map((row) => (
                    <VariantEditor
                      key={row.variantId}
                      row={row}
                      threshold={props.threshold}
                      savingId={props.savingId}
                      draftStocks={props.draftStocks}
                      onDraftChange={props.onDraftChange}
                      onCommit={props.onCommit}
                      onChangeBy={props.onChangeBy}
                      onHistory={props.onHistory}
                      movementLoading={props.movementLoading}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
