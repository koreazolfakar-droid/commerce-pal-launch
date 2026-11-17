import { dashboardListHref } from "@/dashboard/lib/listContext";
import { useLanguage } from "@/dashboard/i18n";
import { ArrowLeft, Loader2, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  deletePurchaseOrderDraft,
  loadPurchaseOrderEditData,
  updatePurchaseOrderDraft,
  type ProcurementProductOption,
  type PurchaseOrderSummary,
  type PurchaseOrderEditData,
} from "@/dashboard/data/receiving";

type DraftLine = {
  id: string;
  optionKey: string;
  expectedQuantity: string;
  unitCost: string;
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">
      {children}
    </div>
  );
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function optionKeyForLine(
  line: PurchaseOrderSummary["items"][number],
  options: ProcurementProductOption[],
) {
  const preferred = line.variantId ?? line.productId;
  if (options.some((option) => option.key === preferred)) return preferred;
  return (
    options.find(
      (option) => option.productId === line.productId && option.variantId === line.variantId,
    )?.key ?? ""
  );
}

export default function PurchaseOrderEditPage({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const [editData, setEditData] = useState<PurchaseOrderEditData | null>(null);
  const [po, setPo] = useState<PurchaseOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const mutationLock = useRef(false);
  const activeId = useRef(id);
  activeId.current = id;

  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expectedAt, setExpectedAt] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  const load = useCallback(async () => {
    const request = ++requestVersion.current;
    setLoading(true);
    setError("");
    setPo((current) => current?.id === id ? current : null);
    try {
      const next = await loadPurchaseOrderEditData(id);
      if (request !== requestVersion.current || activeId.current !== id) return;
      const found = next.purchaseOrder;
      if (!found) throw new Error("Purchase order was not found.");
      if (found.status !== "draft") throw new Error("Only draft purchase orders can be edited.");

      setEditData(next);
      setPo(found);
      setSupplierId(found.supplierId);
      setLocationId(
        found.locationId ?? next.locations.find((location) => location.isActive)?.id ?? "",
      );
      setPoNumber(found.poNumber);
      setCurrency(found.currency);
      setExpectedAt(found.expectedAt ? found.expectedAt.slice(0, 16) : "");
      setDiscount(String(found.discountAmount));
      setTax(String(found.taxAmount));
      setShipping(String(found.shippingAmount));
      setExchangeRate(String(found.exchangeRate));
      setNotes(found.notes ?? "");
      setLines(
        found.items.map((line) => ({
          id: line.id,
          optionKey: optionKeyForLine(line, next.productOptions),
          expectedQuantity: String(line.expectedQuantity),
          unitCost: String(line.unitCost),
        })),
      );
      setError("");
    } catch (cause) {
      if (request !== requestVersion.current || activeId.current !== id) return;
      setError(cause instanceof Error ? cause.message : "Unable to load purchase order.");
    } finally {
      if (request === requestVersion.current && activeId.current === id) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    activeId.current = id;
    void load();
    return () => {
      requestVersion.current += 1;
      activeId.current = "";
    };
  }, [id, load]);

  const total = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const qty = Number(line.expectedQuantity || 0);
      const cost = Number(line.unitCost || 0);
      return sum + (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(cost) ? cost : 0);
    }, 0);
    return Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0) + Number(shipping || 0));
  }, [discount, lines, shipping, tax]);

  const save = async () => {
    if (!editData || !po || po.id !== id || loading || mutationLock.current) return;
    if (!supplierId) return toast.error("Select a supplier.");
    if (!locationId) return toast.error("Select a store / warehouse.");
    if (!poNumber.trim()) return toast.error("PO number is required.");
    if (!lines.length) return toast.error("Add at least one product.");

    mutationLock.current = true;
    setSaving(true);
    try {
      for (const [label, value] of [["Discount", discount], ["Tax", tax], ["Shipping", shipping]]) {
        if (!Number.isFinite(Number(value || 0)) || Number(value || 0) < 0) {
          throw new Error(`${label} must be zero or greater.`);
        }
      }
      if (!exchangeRate.trim() || !Number.isFinite(Number(exchangeRate)) || Number(exchangeRate) <= 0) {
        throw new Error("Enter a positive exchange rate.");
      }
      const used = new Set<string>();
      const items = lines.map((line) => {
        const option = editData.productOptions.find((item) => item.key === line.optionKey);
        if (!option) throw new Error("Select a valid product.");
        if (used.has(option.key))
          throw new Error("The same product / variant cannot be added twice.");
        used.add(option.key);

        const expectedQuantity = Number(line.expectedQuantity);
        const unitCost = Number(line.unitCost);
        if (!Number.isSafeInteger(expectedQuantity) || expectedQuantity <= 0) {
          throw new Error("Expected quantity must be a positive whole number.");
        }
        if (!line.unitCost.trim() || !Number.isFinite(unitCost) || unitCost < 0)
          throw new Error("Unit cost must be zero or greater.");

        return {
          productId: option.productId,
          variantId: option.variantId,
          expectedQuantity,
          unitCost,
        };
      });

      await updatePurchaseOrderDraft({
        purchaseOrderId: po.id,
        expectedUpdatedAt: po.updatedAt,
        supplierId,
        locationId,
        poNumber,
        currency,
        expectedAt: expectedAt ? new Date(expectedAt).toISOString() : null,
        discountAmount: Number(discount || 0),
        taxAmount: Number(tax || 0),
        shippingAmount: Number(shipping || 0),
        exchangeRate: Number(exchangeRate || 1),
        notes,
        items,
      });
      if (activeId.current !== po.id) return;
      toast.success("Purchase order draft updated.");
      navigate(`/dashboard/purchase-orders/${po.id}`);
    } catch (cause) {
      if (activeId.current === po.id) toast.error(cause instanceof Error ? cause.message : "Purchase order update failed.");
    } finally {
      mutationLock.current = false;
      if (activeId.current) setSaving(false);
    }
  };

  const removeDraft = async () => {
    if (!po || po.id !== id || loading || mutationLock.current) return;
    if (!window.confirm(`Delete draft ${po.poNumber}? This cannot be undone.`)) return;
    mutationLock.current = true;
    setSaving(true);
    try {
      await deletePurchaseOrderDraft(po.id, po.updatedAt);
      if (activeId.current !== po.id) return;
      toast.success("Purchase order draft deleted.");
      navigate(dashboardListHref("/dashboard/purchase-orders"));
    } catch (cause) {
      if (activeId.current === po.id) toast.error(cause instanceof Error ? cause.message : "Delete failed.");
    } finally {
      mutationLock.current = false;
      if (activeId.current) setSaving(false);
    }
  };

  if (loading || (po && po.id !== id)) {
    return (
      <div className="grid min-h-[440px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !editData || !po) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">
          {t("Purchase order cannot be edited.")}
        </div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button
          onClick={() => navigate(`/dashboard/purchase-orders/${id}`)}
          className="mt-4 rounded-xl bg-[#14203a] px-4 py-2 text-[11px] font-bold text-white"
        >
          {t("Back to PO")}
        </button>
        <button type="button" onClick={() => void load()} className="ms-2 mt-4 rounded-xl border border-border bg-card px-4 py-2 text-[11px] font-bold text-foreground">
          {t("Retry")}
        </button>
      </div>
    );
  }

  const suppliers = editData.suppliers.filter((supplier) => supplier.isActive);
  const locations = editData.locations.filter((location) => location.isActive);

  return (
    <div>
      <button
        disabled={saving}
        onClick={() => navigate(`/dashboard/purchase-orders/${po.id}`)}
        className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold text-slate-500"
      >
        <ArrowLeft className="size-3.5" />
        {t("Back to")} {po.poNumber}
      </button>

      <div className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">
          {t("Commerce / Procurement")}
        </div>
        <h1 className="mt-2 text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
          {t("Edit Purchase Order")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("Draft-only editing. Issued or received POs remain locked.")}
        </p>
      </div>

      <fieldset disabled={saving} aria-busy={saving} className="min-w-0 space-y-5 rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)] sm:p-5">
        <p className="text-xs text-muted-foreground">{lang === "ar" ? "أدخل الكمية والتكلفة لكل سطر. تبقى المسودة قابلة للتعديل حتى إرسالها للموافقة." : "Enter a quantity and cost for each line. The draft remains editable until submitted for approval."}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <FieldLabel>{t("Supplier")}</FieldLabel>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>{t("Store / Warehouse")}</FieldLabel>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>{t("PO Number")}</FieldLabel>
            <input
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
            />
          </label>
          <label>
            <FieldLabel>{t("Expected delivery")}</FieldLabel>
            <input
              type="datetime-local"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
            />
          </label>
          <label>
            <FieldLabel>{t("Currency")}</FieldLabel>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
            >
              <option value="USD">{t("USD")}</option>
              <option value="LBP">{t("LBP")}</option>
              <option value="EUR">{t("EUR")}</option>
            </select>
          </label>
          <label>
            <FieldLabel>{t("Exchange rate")}</FieldLabel>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
            />
          </label>
          <label className="md:col-span-2">
            <FieldLabel>{t("Notes")}</FieldLabel>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
            />
          </label>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div
              key={line.id}
              className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 md:grid-cols-[1fr_120px_140px_38px] md:items-end"
            >
              <label>
                <FieldLabel>{t("Product / Variant")}</FieldLabel>
                <select
                  value={line.optionKey}
                  onChange={(e) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, optionKey: e.target.value } : item,
                      ),
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]"
                >
                  {editData.productOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.title} {option.sku ? `· ${option.sku}` : ""} {t("· stock")}{" "}
                      {option.currentStock}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>{t("Expected qty")}</FieldLabel>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={line.expectedQuantity}
                  onChange={(e) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, expectedQuantity: e.target.value } : item,
                      ),
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <label>
                <FieldLabel>{t("Unit cost")}</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, unitCost: e.target.value } : item,
                      ),
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>
              <button
                aria-label={`Remove line ${index + 1}`}
                onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const option = editData.productOptions[0];
            if (!option) return;
            setLines((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                optionKey: option.key,
                expectedQuantity: "1",
                unitCost: "0",
              },
            ]);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-600"
        >
          <Plus className="size-3.5" /> {t("Add line")}
        </button>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label>
            <FieldLabel>{t("Discount")}</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
            />
          </label>
          <label>
            <FieldLabel>{t("VAT / Tax")}</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
            />
          </label>
          <label>
            <FieldLabel>{t("Shipping")}</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
            />
          </label>
          <div className="rounded-xl bg-white p-3 sm:col-span-2">
            <div className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">
              {t("Final total")}
            </div>
            <div className="mt-1 text-lg font-bold text-[#14203a]">{money(total, currency)}</div>
            <div className="mt-1 text-[9px] text-slate-400">
              {t("Subtotal − discount + tax + shipping")}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <button
            onClick={() => void removeDraft()}
            disabled={saving}
            className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[11px] font-bold text-rose-700 disabled:opacity-50"
          >
            {t("Delete draft")}
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-5 text-[11px] font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{" "}
            {t("Save draft changes")}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
