import { Link } from "wouter";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/dashboard/i18n";
import { toast } from "sonner";
import type { InventoryRow } from "@/dashboard/data/inventory";
import { groupInventoryRows } from "./groupInventoryRows";

type Props = {
  rows: InventoryRow[];
  exactMatches: ReadonlySet<string>;
  selection: ReadonlySet<string> | null;
  onSelect: (rows: InventoryRow[]) => void;
  onAdjust: (row: InventoryRow) => void;
  onCancelDraft: (id: string) => void;
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

function formatMovement(row: InventoryRow, loading: boolean, lang: string) {
  if (!row.lastMovementAt || row.lastMovementDelta === null) return loading ? "Loading…" : "—";
  const sign = row.lastMovementDelta > 0 ? "+" : "";
  return `${sign}${row.lastMovementDelta} · ${new Date(row.lastMovementAt).toLocaleString(lang === "ar" ? "ar-LB" : "en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
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
  const classes =
    status === "Out of stock"
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
      : status === "Low stock"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        : status === "In stock"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {t(status)}
    </span>
  );
}

function SelectionCheck({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean | "mixed";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      className="inventory-select-check"
      onClick={onClick}
    >
      <span aria-hidden="true">
        {checked === "mixed" ? <Minus size={14} /> : checked ? <Check size={14} /> : null}
      </span>
    </button>
  );
}

function VariantEditor({
  row,
  savingId,
  draftStocks,
  onDraftChange,
  onCancelDraft,
  onCommit,
  onSelect,
  onAdjust,
  exactMatches,
  selection,
  onChangeBy,
  onHistory,
  movementLoading,
  threshold,
}: Omit<Props, "rows" | "completeGroups"> & { row: InventoryRow }) {
  const { t, lang } = useLanguage();
  const [quickOpen, setQuickOpen] = useState(false);
  const saving = savingId === row.variantId;
  const blocked = Boolean(savingId) || !row.trackInventory;
  const pendingDraft =
    draftStocks[row.variantId] !== undefined && draftStocks[row.variantId] !== String(row.stock);
  const quickBlocked = blocked || pendingDraft;
  const label = `${row.productName} — ${row.variantTitle || t("Default")}`;

  return (
    <div className="inventory-variant" data-match={exactMatches.has(row.variantId) || undefined}>
      {selection && row.trackInventory && (
        <SelectionCheck
          label={`${t("Select variant")} · ${label} · ${row.sku || row.variantId}`}
          checked={selection.has(row.variantId)}
          onClick={() => onSelect([row])}
        />
      )}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-sm font-semibold text-foreground">
            <bdi>{row.variantTitle || t("Default")}</bdi>
          </span>
          {exactMatches.has(row.variantId) && (
            <span className="inventory-exact-match">{t("Exact match")}</span>
          )}
          <VariantStatus row={row} threshold={threshold} />
        </div>
        {row.optionsLabel && (
          <p className="break-words text-xs text-muted-foreground">{row.optionsLabel}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex max-w-full items-center gap-1 break-all">
            <span>
              <span className="font-semibold">{t("SKU")}:</span> <bdi>{row.sku || "—"}</bdi>
            </span>
            {row.sku && (
              <button
                type="button"
                title={t("Copy SKU")}
                aria-label={`${t("Copy SKU")}: ${row.sku}`}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-600"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(row.sku);
                    toast.success(t("SKU copied"));
                  } catch {
                    toast.error(t("Unable to copy SKU"));
                  }
                }}
              >
                <Copy className="size-3.5" />
              </button>
            )}
          </span>
          {row.barcode && (
            <span className="break-all">
              {t("Barcode")}: <bdi>{row.barcode}</bdi>
            </span>
          )}
        </div>
      </div>
      <div className="inventory-variant-actions">
        <div className="inventory-variant-balance">
          <span>{t("On hand")}</span>
          <strong>
            <bdi>
              {row.trackInventory ? row.stock.toLocaleString(lang === "ar" ? "ar-LB" : "en") : "—"}
            </bdi>
          </strong>
        </div>
        {!selection && (
          <div className="inventory-variant-buttons">
            {row.trackInventory && (
              <>
                <button
                  className="dashboard-button"
                  type="button"
                  disabled={quickBlocked}
                  onClick={() => onAdjust(row)}
                  aria-label={`${t("Adjust stock")} · ${label}`}
                >
                  <SlidersHorizontal size={15} /> {t("Adjust stock")}
                </button>
                <button
                  className="dashboard-button"
                  type="button"
                  aria-expanded={quickOpen}
                  aria-controls={`inventory-quick-${row.variantId}`}
                  onClick={() => setQuickOpen((open) => !open)}
                >
                  {t("Quick edits")} <ChevronDown size={15} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onHistory(row)}
              aria-label={`${t("View inventory history for")} ${label}`}
              className="inventory-history-button dashboard-button"
              title={t("History")}
            >
              <History size={16} />
              <span>
                <strong>{t("History")}</strong>
                {row.lastMovementAt && (
                  <small>
                    <bdi>{t(formatMovement(row, movementLoading, lang))}</bdi>
                  </small>
                )}
              </span>
            </button>
          </div>
        )}
      </div>
      {!selection && row.trackInventory && (quickOpen || pendingDraft) && (
        <div className="inventory-quick-edit" id={`inventory-quick-${row.variantId}`}>
          <button
            type="button"
            onClick={() => onChangeBy(row, -1)}
            disabled={quickBlocked || row.stock <= 0}
            aria-label={`${t("Decrease stock for")} ${label}`}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onChangeBy(row, -5)}
            disabled={quickBlocked || row.stock < 5}
            title={t("Decrease stock by five")}
            aria-label={`${t("Decrease stock by five")}: ${label}`}
            className="grid h-11 min-w-10 shrink-0 place-items-center rounded-lg border border-border bg-card px-1 text-xs font-semibold tabular-nums text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
          >
            −5
          </button>
          <input
            value={draftStocks[row.variantId] ?? String(row.stock)}
            onChange={(event) => onDraftChange(row.variantId, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCommit(row);
              if (event.key === "Escape") onCancelDraft(row.variantId);
            }}
            disabled={blocked}
            aria-label={`${t("Set stock for")} ${label}`}
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
            aria-label={`${t("Increase stock for")} ${label}`}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => onChangeBy(row, 5)}
            disabled={quickBlocked}
            title={t("Increase stock by five")}
            aria-label={`${t("Increase stock by five")}: ${label}`}
            className="grid h-11 min-w-10 shrink-0 place-items-center rounded-lg border border-blue-300 bg-blue-50 px-1 text-xs font-semibold tabular-nums text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
          >
            +5
          </button>
          {pendingDraft && (
            <div className="inventory-quick-confirm">
              <button
                type="button"
                className="dashboard-button dashboard-button-primary"
                disabled={blocked || !draftStocks[row.variantId]?.trim()}
                onClick={() => onCommit(row)}
              >
                {t("Save")}
              </button>
              <button
                type="button"
                className="dashboard-button"
                disabled={blocked}
                onClick={() => onCancelDraft(row.variantId)}
              >
                {t("Cancel")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Grouped presentation only; stock writes remain scoped to the original variant ID. */
export default function InventoryGroupedList(props: Props) {
  const { t, lang } = useLanguage();
  const number = new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en");
  const groups = useMemo(
    () => groupInventoryRows(props.rows, props.threshold),
    [props.rows, props.threshold],
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="inventory-groups" data-selecting={Boolean(props.selection) || undefined}>
      {groups.length > 0 && (
        <div className="inventory-column-labels" aria-hidden="true">
          <span>{t("Product")}</span>
          <span>{t("Stock status")}</span>
          <span>{t(props.completeGroups ? "On hand" : "On hand · this page")}</span>
        </div>
      )}
      {groups.map((group) => {
        const match = group.variants.find((row) => props.exactMatches.has(row.variantId));
        const expansionKey = match ? `${group.productId}:${match.variantId}` : group.productId;
        const isOpen = expanded[expansionKey] ?? (Boolean(match) || group.variants.length === 1);
        const selectable = props.selection
          ? group.variants.filter((row) => row.trackInventory)
          : [];
        const selectedCount = selectable.filter((row) =>
          props.selection?.has(row.variantId),
        ).length;
        const sectionId = `inventory-product-${group.productId}`;
        return (
          <section key={group.productId} className="bg-card">
            <div className="inventory-group">
              {selectable.length > 0 && (
                <SelectionCheck
                  label={`${t("Select product variants")} · ${group.productName}`}
                  checked={
                    selectedCount === selectable.length ? true : selectedCount > 0 ? "mixed" : false
                  }
                  onClick={() => props.onSelect(selectable)}
                />
              )}
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={sectionId}
                onClick={() => setExpanded((current) => ({ ...current, [expansionKey]: !isOpen }))}
                className="inventory-group-toggle"
              >
                <span className="inventory-product-photo">
                  {group.image ? (
                    <img src={group.image} alt="" loading="lazy" />
                  ) : (
                    <Package size={21} aria-hidden="true" />
                  )}
                </span>
                <span className="inventory-product-name">
                  <strong>
                    <bdi>{group.productName}</bdi>
                  </strong>
                  <small>
                    {[group.brand, group.category].filter(Boolean).join(" · ") ||
                      t("Uncategorized")}
                  </small>
                  <small>
                    {number.format(group.variants.length)}{" "}
                    {t(props.completeGroups ? "Variants" : "Variants on this page")}
                  </small>
                </span>
                <span className="inventory-health">
                  {group.outCount > 0 && (
                    <span data-tone="out">
                      {t("Out of stock")} · {number.format(group.outCount)}
                    </span>
                  )}
                  {group.lowCount > 0 && (
                    <span data-tone="low">
                      {t("Low stock")} · {number.format(group.lowCount)}
                    </span>
                  )}
                  {!group.lowCount && !group.outCount && (
                    <span data-tone={group.trackedCount ? "available" : "untracked"}>
                      {t(group.trackedCount ? "In stock" : "Not tracked")}
                    </span>
                  )}
                </span>
                <span className="inventory-balance">
                  <small>{t(props.completeGroups ? "On hand" : "On hand · this page")}</small>
                  <strong>
                    {group.trackedCount ? number.format(group.visibleTrackedUnits) : "—"}
                  </strong>
                </span>
                {isOpen ? (
                  <ChevronUp className="inventory-disclosure" size={17} />
                ) : (
                  <ChevronDown className="inventory-disclosure" size={17} />
                )}
              </button>
              <Link
                href={`/dashboard/products/${group.productId}`}
                className="inventory-product-edit"
                aria-label={`${t("Edit product")}: ${group.productName}`}
              >
                <Pencil className="size-4" />
              </Link>
            </div>
            {isOpen && (
              <div
                id={sectionId}
                role="region"
                aria-label={`${group.productName} · ${t("Variants")}`}
                className="border-t border-border bg-muted/30 ps-2 sm:ps-5"
              >
                <div className="rounded-s-xl bg-card">
                  {group.variants.map((row) => (
                    <VariantEditor key={row.variantId} row={row} {...props} />
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
