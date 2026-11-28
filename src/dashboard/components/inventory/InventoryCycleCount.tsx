import { Check, ClipboardCheck, Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DashboardModal from "@/dashboard/components/DashboardModal";
import { readCountBalance, setInventoryStock, type InventoryRow } from "@/dashboard/data/inventory";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import { useLanguage } from "@/dashboard/i18n";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import { parseInventoryQuantity } from "./inventoryQuantity";

type CountLine = { row: InventoryRow; input: string; posted: boolean; error: string };

export default function InventoryCycleCount({
  rows,
  onClose,
  onPosted,
}: {
  rows: InventoryRow[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const { t, lang } = useLanguage();
  // A count compares against the balance staff saw when they opened the worksheet.
  const [lines, setLines] = useState<CountLine[]>(() =>
    rows.map((row) => ({ row, input: "", posted: false, error: "" })),
  );
  const [step, setStep] = useState<"count" | "review" | "complete">("count");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const entered = lines.filter((line) => line.input.trim() !== "");
  const invalid = entered.some((line) => parseInventoryQuantity(line.input) === null);
  const differences = entered.filter(
    (line) =>
      parseInventoryQuantity(line.input) !== null &&
      parseInventoryQuantity(line.input) !== line.row.stock,
  );
  const remaining = differences.filter((line) => !line.posted);
  const hasError = lines.some((line) => line.error);
  const dirty = step !== "complete" && entered.some((line) => !line.posted);
  useDashboardUnsavedChanges(dirty || busy);
  const number = new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en");
  const search = query.trim().toLowerCase();
  const visible =
    step === "count"
      ? lines.filter(({ row }) =>
          [row.productName, row.variantTitle, row.sku, row.barcode].some((field) =>
            field.toLowerCase().includes(search),
          ),
        )
      : differences;

  function update(id: string, patch: Partial<CountLine>) {
    setLines((current) =>
      current.map((line) => (line.row.variantId === id ? { ...line, ...patch } : line)),
    );
  }

  function close() {
    if (lock.current) return;
    if (!dirty || window.confirm(t("Discard the unposted entries in this count?"))) onClose();
  }

  function exportSheet() {
    downloadCsv(`space-call-cycle-count-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        "Product",
        "Variant",
        "Variant ID",
        "SKU",
        "Barcode",
        "Opening balance",
        "Counted",
        "Variance",
        "Adjustment posted",
        "Count note",
      ].map(t),
      ...lines.map(({ row, input, posted }) => {
        const count = parseInventoryQuantity(input);
        return [
          row.productName,
          row.variantTitle,
          row.variantId,
          row.sku,
          row.barcode,
          row.stock,
          count ?? input,
          count === null ? "" : count - row.stock,
          posted ? t("Yes") : "",
          note,
        ];
      }),
    ]);
  }

  async function post() {
    if (lock.current || invalid || hasError || !entered.length || step !== "review") return;
    lock.current = true;
    setBusy(true);
    let attempted = false;
    try {
      for (const line of remaining) {
        if (!mounted.current) return;
        attempted = true;
        try {
          await setInventoryStock(
            line.row,
            parseInventoryQuantity(line.input)!,
            [t("Cycle count"), note.trim()].filter(Boolean).join(" · "),
          );
        } catch (cause) {
          if (mounted.current)
            update(line.row.variantId, {
              error: cause instanceof Error ? t(cause.message) : t("Inventory update failed."),
            });
          return;
        }
        if (mounted.current) update(line.row.variantId, { posted: true });
      }
      if (mounted.current) setStep("complete");
    } finally {
      lock.current = false;
      if (mounted.current) {
        setBusy(false);
        if (attempted) onPosted();
      }
    }
  }

  async function recount(line: CountLine) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const stock = await readCountBalance(line.row);
      if (mounted.current) {
        update(line.row.variantId, { row: { ...line.row, stock }, input: "", error: "" });
        setQuery(line.row.sku || line.row.productName);
        setStep("count");
      }
    } catch (cause) {
      if (mounted.current)
        update(line.row.variantId, {
          error: cause instanceof Error ? t(cause.message) : t("Unable to reload balance."),
        });
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div className="inventory-count-dialog">
      <DashboardModal
        title={
          step === "count" ? "Cycle count" : step === "review" ? "Review count" : "Count complete"
        }
        subtitle={
          step === "count"
            ? "Count tracked variants on this page. Leave uncounted quantities blank."
            : step === "review"
              ? "Review each difference before posting it to inventory history."
              : "Download the worksheet for your records."
        }
        onClose={close}
      >
        <div className="count-summary" aria-live="polite">
          <span>
            <strong>
              {number.format(entered.length)} / {number.format(lines.length)}
            </strong>{" "}
            {t("Counted")}
          </span>
          <span>
            <strong>{number.format(differences.length)}</strong> {t("Differences")}
          </span>
          <span>
            <strong>{number.format(lines.filter((line) => line.posted).length)}</strong>{" "}
            {t("Posted")}
          </span>
        </div>
        {step === "count" && (
          <input
            className="count-search"
            type="search"
            aria-label={t("Find a variant in this count")}
            placeholder={t("Find a variant in this count")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="count-lines">
          {visible.map((line) => {
            const { row } = line;
            const actual = parseInventoryQuantity(line.input);
            const diff = actual === null ? null : actual - row.stock;
            const invalidLine = Boolean(line.input.trim()) && actual === null;
            return (
              <div className="count-line" key={row.variantId}>
                <div>
                  <strong dir="auto">{row.productName}</strong>
                  <small>
                    <bdi>{row.variantTitle || t("Default")}</bdi> ·{" "}
                    <bdi>{row.sku || row.barcode || row.variantId}</bdi>
                  </small>
                  <small>
                    {t("Opening balance")} <bdi>{number.format(row.stock)}</bdi>
                  </small>
                </div>
                <div className="count-entry">
                  {step === "count" && !line.posted ? (
                    <label>
                      {t("Counted")}
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-invalid={invalidLine}
                        aria-label={`${t("Counted")} · ${row.productName} · ${row.variantTitle} · ${row.sku || row.variantId}`}
                        value={line.input}
                        onChange={(e) => update(row.variantId, { input: e.target.value })}
                      />
                    </label>
                  ) : (
                    <span>
                      {t("Counted")} <bdi>{actual === null ? "—" : number.format(actual)}</bdi>
                    </span>
                  )}
                  {invalidLine ? (
                    <small className="count-error">
                      {t("Enter a whole quantity from 0 to 2147483647.")}
                    </small>
                  ) : (
                    diff !== null && (
                      <small>
                        {t("Variance")}{" "}
                        <bdi>
                          {diff > 0 ? "+" : ""}
                          {number.format(diff)}
                        </bdi>
                      </small>
                    )
                  )}
                  {line.posted && (
                    <small className="count-posted">
                      <Check size={14} />
                      {t("Posted")}
                    </small>
                  )}
                </div>
                {line.error && (
                  <div role="alert" className="count-failure">
                    <span>{line.error}</span>
                    <button
                      type="button"
                      className="dashboard-button"
                      disabled={busy}
                      onClick={() => void recount(line)}
                    >
                      {t("Reload balance and recount")}
                    </button>
                    <button
                      type="button"
                      className="dashboard-button"
                      disabled={busy}
                      onClick={() => {
                        update(row.variantId, { input: "", error: "" });
                        setQuery("");
                        setStep("count");
                      }}
                    >
                      {t("Leave this entry uncounted")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!visible.length && (
            <p className="count-empty">
              {t(
                step === "count"
                  ? "No matching variants."
                  : "All entered quantities match their opening balances.",
              )}
            </p>
          )}
        </div>
        {step === "review" && remaining.length > 0 && (
          <label className="count-note">
            {t("Count note")}
            <input
              maxLength={240}
              value={note}
              disabled={busy || lines.some((line) => line.posted)}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("Optional note for the movement history")}
            />
          </label>
        )}
        <div className="count-footer" aria-busy={busy}>
          <button type="button" className="dashboard-button" disabled={busy} onClick={exportSheet}>
            <Download size={16} />
            {t("Export worksheet")}
          </button>
          {step === "count" ? (
            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              disabled={!entered.length || invalid}
              onClick={() => setStep("review")}
            >
              {t("Review count")}
            </button>
          ) : step === "review" ? (
            <>
              <button
                type="button"
                className="dashboard-button"
                disabled={busy || hasError}
                onClick={() => {
                  setQuery("");
                  setStep("count");
                }}
              >
                {t("Edit count")}
              </button>
              <button
                type="button"
                className="dashboard-button dashboard-button-primary"
                disabled={busy || hasError}
                onClick={() => void post()}
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ClipboardCheck size={16} />
                )}
                {t(remaining.length ? "Post adjustments" : "Finish count")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              onClick={onClose}
            >
              {t("Close")}
            </button>
          )}
        </div>
      </DashboardModal>
    </div>
  );
}
