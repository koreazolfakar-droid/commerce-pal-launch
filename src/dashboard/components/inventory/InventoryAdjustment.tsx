import { ArrowDown, ArrowUp, Equal, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import DashboardModal from "@/dashboard/components/DashboardModal";
import { readCountBalance, setInventoryStock, type InventoryRow } from "@/dashboard/data/inventory";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import { useLanguage } from "@/dashboard/i18n";
import { MAX_INVENTORY_QUANTITY, parseInventoryQuantity } from "./inventoryQuantity";

const actions = [
  { value: "add", label: "Add units", icon: ArrowUp },
  { value: "remove", label: "Remove units", icon: ArrowDown },
  { value: "set", label: "Set exact balance", icon: Equal },
] as const;

const reasons = [
  "Stock correction",
  "Damaged item",
  "Missing item",
  "Recovered item",
  "Other",
] as const;

export default function InventoryAdjustment({
  row,
  onClose,
  onSaved,
}: {
  row: InventoryRow;
  onClose: () => void;
  onSaved: (stock: number, openingStock: number) => void;
}) {
  const { t, lang } = useLanguage();
  const [stock, setStock] = useState(row.stock);
  const [action, setAction] = useState<(typeof actions)[number]["value"]>("add");
  const [input, setInput] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const quantityInput = useRef<HTMLInputElement>(null);

  const dirty = Boolean(input.trim() || reason || note.trim());
  useDashboardUnsavedChanges(dirty || busy);
  const quantity = parseInventoryQuantity(input);
  const projected =
    quantity === null
      ? null
      : action === "set"
        ? quantity
        : action === "add"
          ? stock + quantity
          : stock - quantity;
  const invalid = projected === null || projected < 0 || projected > MAX_INVENTORY_QUANTITY;
  const number = new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en");
  const delta = !invalid && projected !== null ? projected - stock : null;

  function close() {
    if (lock.current) return;
    if (!dirty || window.confirm(t("Discard this stock adjustment?"))) onClose();
  }

  async function save() {
    if (
      lock.current ||
      invalid ||
      !delta ||
      !reason ||
      (reason === "Other" && !note.trim()) ||
      error
    )
      return;
    lock.current = true;
    setBusy(true);
    try {
      const newStock = await setInventoryStock(
        { ...row, stock },
        projected!,
        [t(reason), note.trim()].filter(Boolean).join(" · "),
      );
      onSaved(newStock, stock);
      toast.success(t("Stock adjustment saved."));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : t("Inventory update failed."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function reload() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      setStock(await readCountBalance(row));
      setInput("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : t("Unable to reload balance."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <DashboardModal title="Adjust stock" subtitle="" onClose={close}>
      <form
        className="inventory-adjustment"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="inventory-adjustment-item">
          <div>
            <strong>
              <bdi>{row.productName}</bdi>
            </strong>
            <span>
              <bdi>{row.variantTitle || t("Default")}</bdi>
              {row.sku && (
                <>
                  {" "}
                  · <bdi>{row.sku}</bdi>
                </>
              )}
            </span>
          </div>
          <div>
            <span>{t("On hand")}</span>
            <strong>
              <bdi>{number.format(stock)}</bdi>
            </strong>
          </div>
        </div>
        <div
          className="inventory-adjustment-actions"
          role="group"
          aria-label={t("Adjustment type")}
        >
          {actions.map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              aria-pressed={action === value}
              disabled={busy}
              onClick={() => {
                setAction(value);
                quantityInput.current?.focus();
              }}
            >
              <Icon size={16} /> {t(label)}
            </button>
          ))}
        </div>
        <div className="inventory-adjustment-fields">
          <label>
            {t(action === "set" ? "New balance" : "Quantity")}
            <input
              ref={quantityInput}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={busy}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(input && invalid)}
            />
          </label>
          <label>
            {t("Adjustment reason")}
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy}
            >
              <option value="">{t("Select a reason")}</option>
              {reasons.map((value) => (
                <option value={value} key={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t(reason === "Other" ? "Required note" : "Optional note")}
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            disabled={busy}
          />
        </label>
        <div className="inventory-adjustment-preview" aria-live="polite">
          <span>{t("Balance after adjustment")}</span>
          <strong>
            <bdi>{delta !== null && projected !== null ? number.format(projected) : "—"}</bdi>
          </strong>
          {delta !== null && delta !== 0 && (
            <bdi>
              {delta > 0 ? "+" : ""}
              {number.format(delta)}
            </bdi>
          )}
          {input.trim() && invalid && (
            <p>
              {t(
                projected !== null && projected < 0
                  ? "The adjustment exceeds available stock."
                  : "Enter a whole quantity from 0 to 2147483647.",
              )}
            </p>
          )}
          {delta === 0 && <p>{t("This adjustment leaves the balance unchanged.")}</p>}
        </div>
        {error && (
          <div className="count-failure" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="dashboard-button"
              disabled={busy}
              onClick={() => void reload()}
            >
              {t("Reload current balance")}
            </button>
          </div>
        )}
        <div className="count-footer">
          <button type="button" className="dashboard-button" disabled={busy} onClick={close}>
            {t("Cancel")}
          </button>
          <button
            type="submit"
            className="dashboard-button dashboard-button-primary"
            disabled={
              busy ||
              invalid ||
              !delta ||
              !reason ||
              (reason === "Other" && !note.trim()) ||
              Boolean(error)
            }
          >
            {busy && <Loader2 className="animate-spin" size={16} />} {t("Save adjustment")}
          </button>
        </div>
      </form>
    </DashboardModal>
  );
}
