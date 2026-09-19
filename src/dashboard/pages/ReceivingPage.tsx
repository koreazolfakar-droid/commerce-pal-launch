import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  approveReceiving,
  createPurchaseOrder,
  createReceiving,
  createReceivingSupplier,
  loadReceivingWorkspace,
  submitPurchaseOrder,
  type PurchaseOrderSummary,
  type ReceivingSummary,
  type ReceivingWorkspace,
} from "@/dashboard/data/receiving";
import { previewReceivingLine } from "@/dashboard/data/receivingRules";

type Panel = "supplier" | "po" | "receive" | null;

type PoDraftLine = {
  id: string;
  optionKey: string;
  expectedQuantity: string;
  unitCost: string;
};

type ReceivingDraftLine = {
  received: string;
  damaged: string;
  unitCost: string;
  overageConfirmed: boolean;
  overageReason: string;
};

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "received" || status === "approved"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "partially_received"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : status === "ordered"
          ? "bg-violet-50 text-violet-700 ring-violet-100"
          : status === "draft"
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-[-.04em] text-[#14203a]">
            {value.toLocaleString()}
          </div>
        </div>
        <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{children}</div>;
}

function integerOrZero(value: string) {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : NaN;
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function purchaseOrderProgress(po: PurchaseOrderSummary) {
  if (po.expectedUnits <= 0) return 0;
  return Math.min(100, Math.round((po.receivedUnits / po.expectedUnits) * 100));
}

export type ProcurementPageMode = "purchase-orders" | "purchase-order-create" | "receiving";

export default function ReceivingPage({
  mode = "receiving",
  purchaseOrderId,
}: {
  mode?: ProcurementPageMode;
  purchaseOrderId?: string;
}) {
  const [, navigate] = useLocation();
  const purchaseOrdersMode = mode === "purchase-orders";
  const purchaseOrderCreateMode = mode === "purchase-order-create";
  const receivingMode = mode === "receiving";
  const [workspace, setWorkspace] = useState<ReceivingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>(() => (purchaseOrderCreateMode ? "po" : null));
  const [query, setQuery] = useState("");
  const [poStatusFilter, setPoStatusFilter] = useState("all");
  const [poSupplierFilter, setPoSupplierFilter] = useState("all");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const [supplierName, setSupplierName] = useState("");
  const [supplierCode, setSupplierCode] = useState("");

  const [poSupplierId, setPoSupplierId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poLines, setPoLines] = useState<PoDraftLine[]>([]);

  const [receivingPoId, setReceivingPoId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [receivingNotes, setReceivingNotes] = useState("");
  const [receivingLines, setReceivingLines] = useState<Record<string, ReceivingDraftLine>>({});

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const next = await loadReceivingWorkspace();
      setWorkspace(next);
      setError("");
      if (manual) toast.success("Purchase orders and receiving refreshed.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to load receiving workspace.";
      setError(message);
      if (manual) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const suppliers = workspace?.suppliers.filter((supplier) => supplier.isActive) ?? [];
  const purchaseOrders = workspace?.purchaseOrders ?? [];
  const receivings = workspace?.receivings ?? [];
  const productOptions = workspace?.productOptions ?? [];
  const openPurchaseOrders = purchaseOrders.filter(
    (po) => po.status === "ordered" || po.status === "partially_received",
  );
  const selectedReceivingPo = purchaseOrders.find((po) => po.id === receivingPoId) ?? null;
  const selectedReceipt = receivings.find((receipt) => receipt.id === selectedReceiptId) ?? null;

  const filteredPurchaseOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        !needle ||
        `${po.poNumber} ${po.supplierName} ${po.status}`.toLowerCase().includes(needle);
      const matchesStatus = poStatusFilter === "all" || po.status === poStatusFilter;
      const matchesSupplier = poSupplierFilter === "all" || po.supplierId === poSupplierFilter;
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [poStatusFilter, poSupplierFilter, purchaseOrders, query]);

  const filteredReceivings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return receivings;
    return receivings.filter((receipt) =>
      `${receipt.receiptNumber} ${receipt.poNumber} ${receipt.supplierName} ${receipt.invoiceNumber} ${receipt.employee}`
        .toLowerCase()
        .includes(needle),
    );
  }, [receivings, query]);

  const resetPo = () => {
    setPoSupplierId(suppliers[0]?.id ?? "");
    setPoNumber("");
    setPoNotes("");
    setPoLines(
      productOptions[0]
        ? [{ id: crypto.randomUUID(), optionKey: productOptions[0].key, expectedQuantity: "1", unitCost: "0" }]
        : [],
    );
  };

  useEffect(() => {
    if (!purchaseOrderCreateMode || !workspace) return;

    const firstSupplier = workspace.suppliers.find((supplier) => supplier.isActive);
    if (!poSupplierId && firstSupplier) setPoSupplierId(firstSupplier.id);

    const firstProduct = workspace.productOptions[0];
    if (!poLines.length && firstProduct) {
      setPoLines([
        {
          id: crypto.randomUUID(),
          optionKey: firstProduct.key,
          expectedQuantity: "1",
          unitCost: "0",
        },
      ]);
    }
  }, [poLines.length, poSupplierId, purchaseOrderCreateMode, workspace]);

  const openPanel = (next: Exclude<Panel, null>) => {
    setPanel(next);
    if (next === "po") resetPo();
    if (next === "receive") {
      const po = openPurchaseOrders[0];
      selectReceivingPo(po?.id ?? "");
      setInvoiceNumber("");
      setEmployeeLabel("");
      setReceivingNotes("");
    }
  };

  const selectReceivingPo = (poId: string) => {
    setReceivingPoId(poId);
    const po = purchaseOrders.find((item) => item.id === poId);
    const next: Record<string, ReceivingDraftLine> = {};
    for (const item of po?.items ?? []) {
      if (item.remainingQuantity <= 0) continue;
      next[item.id] = {
        received: "",
        damaged: "0",
        unitCost: String(item.unitCost),
        overageConfirmed: false,
        overageReason: "",
      };
    }
    setReceivingLines(next);
  };

  useEffect(() => {
    if (!receivingMode || !purchaseOrderId || !workspace) return;
    const po = workspace.purchaseOrders.find(
      (item) =>
        item.id === purchaseOrderId &&
        (item.status === "ordered" || item.status === "partially_received"),
    );
    if (!po) return;

    const next: Record<string, ReceivingDraftLine> = {};
    for (const item of po.items) {
      if (item.remainingQuantity <= 0) continue;
      next[item.id] = {
        received: "",
        damaged: "0",
        unitCost: String(item.unitCost),
        overageConfirmed: false,
        overageReason: "",
      };
    }

    setReceivingPoId(po.id);
    setReceivingLines(next);
    setPanel("receive");
  }, [purchaseOrderId, receivingMode, workspace]);

  const saveSupplier = async () => {
    if (!supplierName.trim()) return toast.error("Supplier name is required.");
    setSaving(true);
    try {
      await createReceivingSupplier({ name: supplierName, code: supplierCode });
      toast.success("Supplier created.");
      setSupplierName("");
      setSupplierCode("");
      setPanel(null);
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Supplier creation failed.");
    } finally {
      setSaving(false);
    }
  };

  const savePo = async () => {
    if (!poSupplierId) return toast.error("Select a supplier.");
    if (!poNumber.trim()) return toast.error("PO number is required.");
    if (!poLines.length) return toast.error("Add at least one product.");

    const used = new Set<string>();
    const items = poLines.map((line) => {
      const option = productOptions.find((item) => item.key === line.optionKey);
      const expectedQuantity = integerOrZero(line.expectedQuantity);
      const unitCost = Number(line.unitCost);
      if (!option) throw new Error("Select a valid product.");
      if (used.has(option.key)) throw new Error("The same product/variant cannot be added twice.");
      used.add(option.key);
      if (!Number.isInteger(expectedQuantity) || expectedQuantity <= 0) {
        throw new Error("Expected quantity must be a positive whole number.");
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("Cost must be zero or greater.");
      return {
        productId: option.productId,
        variantId: option.variantId,
        expectedQuantity,
        unitCost,
      };
    });

    setSaving(true);
    try {
      await createPurchaseOrder({
        supplierId: poSupplierId,
        poNumber,
        notes: poNotes,
        items,
      });
      toast.success("Purchase order draft created.");
      if (purchaseOrderCreateMode) {
        navigate("/dashboard/purchase-orders");
        return;
      }
      setPanel(null);
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Purchase order creation failed.");
    } finally {
      setSaving(false);
    }
  };

  const submitPo = async (po: PurchaseOrderSummary) => {
    if (!window.confirm(`Submit PO ${po.poNumber}? Draft lines will become locked for receiving.`)) return;
    setSaving(true);
    try {
      await submitPurchaseOrder(po.id);
      toast.success(`PO ${po.poNumber} is ready for receiving.`);
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "PO submission failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveReceiving = async () => {
    if (!selectedReceivingPo) return toast.error("Select an open purchase order.");
    if (!invoiceNumber.trim()) return toast.error("Invoice number is required.");

    try {
      const lines = selectedReceivingPo.items.flatMap((item) => {
        const draft = receivingLines[item.id];
        if (!draft) return [];
        const receivedQuantity = integerOrZero(draft.received);
        const damagedQuantity = integerOrZero(draft.damaged);
        const unitCost = Number(draft.unitCost);
        if (!Number.isInteger(receivedQuantity) || !Number.isInteger(damagedQuantity)) {
          throw new Error(`${item.title}: quantities must be non-negative whole numbers.`);
        }
        if (!Number.isFinite(unitCost) || unitCost < 0) {
          throw new Error(`${item.title}: cost must be zero or greater.`);
        }
        if (receivedQuantity + damagedQuantity === 0) return [];

        const preview = previewReceivingLine({
          remainingQuantity: item.remainingQuantity,
          receivedQuantity,
          damagedQuantity,
          overageConfirmed: draft.overageConfirmed,
          overageReason: draft.overageReason,
        });
        if (!preview.canSubmit) throw new Error(`${item.title}: ${preview.errors[0]}`);

        return [
          {
            purchaseOrderItemId: item.id,
            receivedQuantity,
            damagedQuantity,
            unitCost,
            overageConfirmed: draft.overageConfirmed,
            overageReason: draft.overageReason,
          },
        ];
      });

      if (!lines.length) throw new Error("Enter at least one received or damaged quantity.");

      setSaving(true);
      await createReceiving({
        purchaseOrderId: selectedReceivingPo.id,
        invoiceNumber,
        employeeLabel,
        notes: receivingNotes,
        lines,
      });
      toast.success("Receiving draft created. Review it, then approve to update stock.");
      setPanel(null);
      setInvoiceNumber("");
      setEmployeeLabel("");
      setReceivingNotes("");
      setReceivingPoId("");
      setReceivingLines({});
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Receiving draft creation failed.");
    } finally {
      setSaving(false);
    }
  };

  const approve = async (receipt: ReceivingSummary) => {
    if (
      !window.confirm(
        `Approve receipt #${receipt.receiptNumber} for PO ${receipt.poNumber}? This will add ${receipt.stockUnits} usable unit(s) to stock and record purchase movements.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const result = await approveReceiving(receipt.id);
      toast.success(
        `Receiving approved: +${result.stock_units_added} stock unit(s), ${result.damaged_units_recorded} damaged recorded.`,
      );
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Receiving approval failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="grid min-h-[440px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">Receiving could not be loaded.</div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button
          onClick={() => void load(true)}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const draftReceipts = receivings.filter((receipt) => receipt.status === "draft").length;
  const openPos = openPurchaseOrders.length;
  const receivedUnits = receivings
    .filter((receipt) => receipt.status === "approved")
    .reduce((sum, receipt) => sum + receipt.stockUnits, 0);

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Operations
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {purchaseOrderCreateMode
              ? "Create Purchase Order"
              : purchaseOrdersMode
                ? "Purchase Orders"
                : "Receiving"}
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
            {purchaseOrderCreateMode
              ? "Create a supplier purchase order with products, ordered quantities and unit costs."
              : purchaseOrdersMode
                ? "Create, submit, filter and track supplier purchase orders before stock intake."
                : "Receive supplier invoices against issued POs. Stock changes only after explicit approval."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!purchaseOrderCreateMode ? (
            <button
              onClick={() => void load(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          ) : null}

          {purchaseOrderCreateMode ? (
            <button
              onClick={() => navigate("/dashboard/purchase-orders")}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"
            >
              Back to Purchase Orders
            </button>
          ) : purchaseOrdersMode ? (
            <>
              <button
                onClick={() => openPanel("supplier")}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-700"
              >
                <Truck className="size-3.5" />
                Supplier
              </button>
              <button
                onClick={() => navigate("/dashboard/purchase-orders/new")}
                disabled={!suppliers.length || !productOptions.length}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-3.5 text-[11px] font-bold text-white disabled:opacity-40"
              >
                <ClipboardList className="size-3.5" />
                New PO
              </button>
            </>
          ) : (
            <button
              onClick={() => openPanel("receive")}
              disabled={!openPurchaseOrders.length}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-3.5 text-[11px] font-bold text-white disabled:opacity-40"
            >
              <PackageCheck className="size-3.5" />
              Receive PO
            </button>
          )}
        </div>
      </div>

      {!purchaseOrderCreateMode ? (
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {purchaseOrdersMode ? (
          <>
            <StatCard icon={ClipboardList} label="Open purchase orders" value={openPos} detail="Ordered or partially received" />
            <StatCard icon={Truck} label="Active suppliers" value={suppliers.length} detail="Available for new POs" />
            <StatCard
              icon={Boxes}
              label="Expected units"
              value={purchaseOrders.reduce((sum, po) => sum + po.expectedUnits, 0)}
              detail="Across loaded purchase orders"
            />
            <StatCard
              icon={ReceiptText}
              label="Draft POs"
              value={purchaseOrders.filter((po) => po.status === "draft").length}
              detail="Waiting to be submitted"
            />
          </>
        ) : (
          <>
            <StatCard icon={ClipboardList} label="Open purchase orders" value={openPos} detail="Available for receiving" />
            <StatCard icon={ReceiptText} label="Awaiting approval" value={draftReceipts} detail="Draft receiving records" />
            <StatCard icon={Boxes} label="Approved stock units" value={receivedUnits} detail="Usable units received" />
            <StatCard icon={Truck} label="Active suppliers" value={suppliers.length} detail="Linked suppliers" />
          </>
        )}
      </div>
      ) : null}

      {panel && (
        (purchaseOrdersMode && panel === "supplier") ||
        (purchaseOrderCreateMode && panel === "po") ||
        (receivingMode && panel === "receive")
      ) ? (
        <div className="mb-5 rounded-2xl border border-indigo-100 bg-white p-4 shadow-[0_10px_28px_rgba(59,72,160,.07)] sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#14203a]">
                {panel === "supplier" ? "New supplier" : panel === "po" ? "New purchase order" : "Receive purchase order"}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                {panel === "receive"
                  ? "Create a draft first. Stock changes only when the draft is explicitly approved."
                  : "All records are saved directly to Supabase."}
              </div>
            </div>
            <button
              onClick={() =>
                purchaseOrderCreateMode
                  ? navigate("/dashboard/purchase-orders")
                  : setPanel(null)
              }
              className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"
              aria-label={purchaseOrderCreateMode ? "Back to purchase orders" : "Close panel"}
            >
              <X className="size-4 text-slate-500" />
            </button>
          </div>

          {panel === "supplier" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
              <label>
                <FieldLabel>Supplier</FieldLabel>
                <input
                  value={supplierName}
                  onChange={(event) => setSupplierName(event.target.value)}
                  placeholder="Supplier name"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <label>
                <FieldLabel>Code (optional)</FieldLabel>
                <input
                  value={supplierCode}
                  onChange={(event) => setSupplierCode(event.target.value)}
                  placeholder="SUP-001"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                />
              </label>
              <button
                onClick={() => void saveSupplier()}
                disabled={saving}
                className="h-10 rounded-xl bg-[#5968ea] px-5 text-[11px] font-bold text-white disabled:opacity-50"
              >
                Save supplier
              </button>
            </div>
          ) : null}

          {panel === "po" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label>
                  <FieldLabel>Supplier</FieldLabel>
                  <select
                    value={poSupplierId}
                    onChange={(event) => setPoSupplierId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>PO number</FieldLabel>
                  <input
                    value={poNumber}
                    onChange={(event) => setPoNumber(event.target.value)}
                    placeholder="PO-2026-001"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
                <label>
                  <FieldLabel>Notes</FieldLabel>
                  <input
                    value={poNotes}
                    onChange={(event) => setPoNotes(event.target.value)}
                    placeholder="Optional notes"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400"
                  />
                </label>
              </div>

              <div className="space-y-2">
                {poLines.map((line, index) => (
                  <div key={line.id} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 md:grid-cols-[1fr_120px_140px_38px] md:items-end">
                    <label>
                      <FieldLabel>Product / Variant</FieldLabel>
                      <select
                        value={line.optionKey}
                        onChange={(event) =>
                          setPoLines((current) =>
                            current.map((item) => item.id === line.id ? { ...item, optionKey: event.target.value } : item),
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px]"
                      >
                        {productOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.title} {option.sku ? `· ${option.sku}` : ""} · stock {option.currentStock}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <FieldLabel>Expected qty</FieldLabel>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={line.expectedQuantity}
                        onChange={(event) =>
                          setPoLines((current) =>
                            current.map((item) => item.id === line.id ? { ...item, expectedQuantity: event.target.value } : item),
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                      />
                    </label>
                    <label>
                      <FieldLabel>Unit cost</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        onChange={(event) =>
                          setPoLines((current) =>
                            current.map((item) => item.id === line.id ? { ...item, unitCost: event.target.value } : item),
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                      />
                    </label>
                    <button
                      aria-label={`Remove PO line ${index + 1}`}
                      onClick={() => setPoLines((current) => current.filter((item) => item.id !== line.id))}
                      className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <button
                  onClick={() => {
                    const option = productOptions[0];
                    if (!option) return;
                    setPoLines((current) => [
                      ...current,
                      { id: crypto.randomUUID(), optionKey: option.key, expectedQuantity: "1", unitCost: "0" },
                    ]);
                  }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-600"
                >
                  <Plus className="size-3.5" /> Add line
                </button>
                <button
                  onClick={() => void savePo()}
                  disabled={saving}
                  className="h-10 rounded-xl bg-[#5968ea] px-5 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  Save PO draft
                </button>
              </div>
            </div>
          ) : null}

          {panel === "receive" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label>
                  <FieldLabel>Purchase order</FieldLabel>
                  <select
                    value={receivingPoId}
                    onChange={(event) => selectReceivingPo(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px]"
                  >
                    <option value="">Select open PO</option>
                    {openPurchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} · {po.supplierName} · {po.remainingUnits} remaining
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>Invoice number</FieldLabel>
                  <input
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    placeholder="INV-001"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                  />
                </label>
                <label>
                  <FieldLabel>Receiving employee</FieldLabel>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={employeeLabel}
                      onChange={(event) => setEmployeeLabel(event.target.value)}
                      placeholder="Optional display name"
                      className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[12px]"
                    />
                  </div>
                </label>
              </div>

              {selectedReceivingPo ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[980px] text-left">
                    <thead className="bg-slate-50 text-[9px] uppercase tracking-[.08em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2.5">Item</th>
                        <th className="px-3 py-2.5">Expected</th>
                        <th className="px-3 py-2.5">Remaining</th>
                        <th className="px-3 py-2.5">Received</th>
                        <th className="px-3 py-2.5">Damaged</th>
                        <th className="px-3 py-2.5">Cost</th>
                        <th className="px-3 py-2.5">Difference</th>
                        <th className="px-3 py-2.5">Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceivingPo.items
                        .filter((item) => item.remainingQuantity > 0)
                        .map((item) => {
                          const draft = receivingLines[item.id];
                          if (!draft) return null;
                          const received = integerOrZero(draft.received);
                          const damaged = integerOrZero(draft.damaged);
                          let preview: ReturnType<typeof previewReceivingLine> | null = null;
                          if (Number.isInteger(received) && Number.isInteger(damaged) && received + damaged > 0) {
                            try {
                              preview = previewReceivingLine({
                                remainingQuantity: item.remainingQuantity,
                                receivedQuantity: received,
                                damagedQuantity: damaged,
                                overageConfirmed: draft.overageConfirmed,
                                overageReason: draft.overageReason,
                              });
                            } catch {
                              preview = null;
                            }
                          }
                          const overage = Boolean(preview?.requiresOverageConfirmation);
                          return (
                            <tr key={item.id} className="border-t border-slate-100 align-top">
                              <td className="px-3 py-3">
                                <div className="text-[11px] font-bold text-slate-700">{item.title}</div>
                                <div className="mt-0.5 font-mono text-[9px] text-slate-400">{item.sku || "—"}</div>
                                {overage ? (
                                  <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                                    <label className="flex items-center gap-2 text-[10px] font-bold text-amber-800">
                                      <input
                                        type="checkbox"
                                        checked={draft.overageConfirmed}
                                        onChange={(event) =>
                                          setReceivingLines((current) => ({
                                            ...current,
                                            [item.id]: { ...draft, overageConfirmed: event.target.checked },
                                          }))
                                        }
                                      />
                                      Confirm excess delivery
                                    </label>
                                    <input
                                      value={draft.overageReason}
                                      maxLength={500}
                                      onChange={(event) =>
                                        setReceivingLines((current) => ({
                                          ...current,
                                          [item.id]: { ...draft, overageReason: event.target.value },
                                        }))
                                      }
                                      placeholder="Reason required"
                                      className="h-8 w-full rounded-lg border border-amber-200 bg-white px-2 text-[10px]"
                                    />
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 text-[11px] font-bold text-slate-600">{item.expectedQuantity}</td>
                              <td className="px-3 py-3">
                                <div className="text-[11px] font-bold text-indigo-600">{item.remainingQuantity}</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReceivingLines((current) => ({
                                      ...current,
                                      [item.id]: {
                                        ...draft,
                                        received: String(item.remainingQuantity),
                                        damaged: "0",
                                        overageConfirmed: false,
                                        overageReason: "",
                                      },
                                    }))
                                  }
                                  className="mt-1 text-[9px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline"
                                >
                                  Fill remaining
                                </button>
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={draft.received}
                                  onChange={(event) =>
                                    setReceivingLines((current) => ({
                                      ...current,
                                      [item.id]: { ...draft, received: event.target.value },
                                    }))
                                  }
                                  className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-[11px]"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={draft.damaged}
                                  onChange={(event) =>
                                    setReceivingLines((current) => ({
                                      ...current,
                                      [item.id]: { ...draft, damaged: event.target.value },
                                    }))
                                  }
                                  className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-[11px]"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={draft.unitCost}
                                  onChange={(event) =>
                                    setReceivingLines((current) => ({
                                      ...current,
                                      [item.id]: { ...draft, unitCost: event.target.value },
                                    }))
                                  }
                                  className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-[11px]"
                                />
                              </td>
                              <td className={`px-3 py-3 text-[11px] font-bold ${(preview?.difference ?? 0) > 0 ? "text-amber-600" : "text-slate-600"}`}>
                                {preview?.difference ?? "—"}
                              </td>
                              <td className="px-3 py-3 text-[11px] font-bold text-rose-600">
                                {preview?.missingQuantity ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[11px] text-slate-400">
                  Select an open PO to load expected and remaining quantities.
                </div>
              )}

              <label>
                <FieldLabel>Receiving notes</FieldLabel>
                <input
                  value={receivingNotes}
                  onChange={(event) => setReceivingNotes(event.target.value)}
                  placeholder="Optional notes"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
                />
              </label>

              <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10px] leading-4 text-blue-700">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Received quantity means usable units only. Damaged units are recorded separately and do not increase stock.
                Any physical overdelivery requires the checkbox and a reason, and the server validates it again during approval.
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => void saveReceiving()}
                  disabled={saving || !selectedReceivingPo}
                  className="h-10 rounded-xl bg-[#5968ea] px-5 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  Create receiving draft
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {purchaseOrdersMode ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[12px] font-bold text-[#14203a]">Purchase order filters</div>
              <div className="mt-1 text-[10px] text-slate-400">
                Filter the PO list before opening an order for receiving.
              </div>
            </div>
            <div className="text-[10px] font-semibold text-slate-400">
              {filteredPurchaseOrders.length} of {purchaseOrders.length} purchase orders
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_minmax(170px,.8fr)_minmax(190px,1fr)_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search PO number or supplier"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/60"
              />
            </label>

            <select
              value={poStatusFilter}
              onChange={(event) => setPoStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-400"
              aria-label="Filter purchase orders by status"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="ordered">Issued</option>
              <option value="partially_received">Partially received</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={poSupplierFilter}
              onChange={(event) => setPoSupplierFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-400"
              aria-label="Filter purchase orders by supplier"
            >
              <option value="all">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPoStatusFilter("all");
                setPoSupplierFilter("all");
              }}
              disabled={!query && poStatusFilter === "all" && poSupplierFilter === "all"}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-500" /> Issued
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" /> Partially received
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> Received
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" /> Draft
            </span>
          </div>
        </div>
      ) : receivingMode ? (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search supplier, PO, invoice, receipt, or employee"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[11px] outline-none focus:border-indigo-400"
            />
          </div>
          <div className="text-[10px] text-slate-400">
            Select issued PO → create receiving → approve → stock movement
          </div>
        </div>
      ) : null}

      {purchaseOrdersMode ? (
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="text-[14px] font-bold text-[#14203a]">Purchase orders</div>
            <div className="mt-1 text-[10px] text-slate-400">Supplier, ordered quantity, cost, and remaining usable quantity</div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            {filteredPurchaseOrders.length}
          </span>
        </div>
        <div className="divide-y divide-slate-100 lg:hidden">
          {filteredPurchaseOrders.map((po) => {
            const progress = purchaseOrderProgress(po);
            return (
              <article key={po.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-indigo-600">{po.poNumber}</div>
                    <div className="mt-1 truncate text-[10px] font-semibold text-slate-600">{po.supplierName}</div>
                  </div>
                  <StatusBadge status={po.status} />
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-slate-400">
                    <span>Receiving progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[9px] text-slate-400">Expected</div>
                    <div className="text-[12px] font-bold text-slate-700">{po.expectedUnits}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <div className="text-[9px] text-emerald-500">Received</div>
                    <div className="text-[12px] font-bold text-emerald-700">{po.receivedUnits}</div>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2">
                    <div className="text-[9px] text-indigo-500">Remaining</div>
                    <div className="text-[12px] font-bold text-indigo-700">{po.remainingUnits}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[9px] text-slate-400">Expected cost</div>
                    <div className="text-[11px] font-bold text-slate-700">{money(po.expectedCost, po.currency)}</div>
                  </div>
                  {po.status === "draft" ? (
                    <button
                      onClick={() => void submitPo(po)}
                      disabled={saving}
                      className="h-8 rounded-lg border border-indigo-100 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700 disabled:opacity-50"
                    >
                      Submit PO
                    </button>
                  ) : po.status === "ordered" || po.status === "partially_received" ? (
                    <button
                      onClick={() => navigate(`/dashboard/receiving/${po.id}`)}
                      className="h-8 rounded-lg bg-[#5968ea] px-3 text-[10px] font-bold text-white"
                    >
                      Receive PO
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-[#fafbfe] text-[9px] uppercase tracking-[.1em] text-slate-400">
              <tr>
                <th className="px-5 py-3">PO number</th>
                <th className="px-3 py-3">Created date</th>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Issued date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchaseOrders.map((po) => (
                <tr key={po.id} className="border-t border-slate-100 transition hover:bg-[#fbfcff]">
                  <td className="px-5 py-3">
                    <div className="text-[11px] font-bold text-indigo-600">{po.poNumber}</div>
                    <div className="mt-0.5 text-[9px] text-slate-400">{po.expectedUnits} ordered units</div>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-slate-500">
                    {new Date(po.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-[11px] font-semibold text-slate-700">{po.supplierName}</div>
                    <div className="mt-0.5 text-[9px] text-slate-400">{po.currency}</div>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-slate-500">
                    {po.orderedAt ? new Date(po.orderedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-3 py-3 text-[11px] font-bold text-slate-700">
                    {money(po.expectedCost, po.currency)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="min-w-32">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-slate-500">{purchaseOrderProgress(po)}%</span>
                        <span className="text-[9px] text-slate-400">
                          {po.receivedUnits} received · {po.remainingUnits} left
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${purchaseOrderProgress(po)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {po.status === "draft" ? (
                      <button
                        onClick={() => void submitPo(po)}
                        disabled={saving}
                        className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        Submit PO
                      </button>
                    ) : po.status === "ordered" || po.status === "partially_received" ? (
                      <button
                        onClick={() => navigate(`/dashboard/receiving/${po.id}`)}
                        className="rounded-lg bg-[#5968ea] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#4f5edb]"
                      >
                        Receive
                      </button>
                    ) : (
                      <span className="text-[9px] font-semibold text-slate-400">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredPurchaseOrders.length ? (
          <div className="px-6 py-10 text-center text-[11px] text-slate-400">No purchase orders yet.</div>
        ) : null}
      </div>
      ) : null}

      {receivingMode ? (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="text-[14px] font-bold text-[#14203a]">Receiving / invoice history</div>
            <div className="mt-1 text-[10px] text-slate-400">
              Invoice, employee, date/time, received, damaged, differences, and approval state
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            {filteredReceivings.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">
          {filteredReceivings.map((receipt) => (
            <article key={receipt.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-bold text-slate-800">Receipt #{receipt.receiptNumber}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {receipt.supplierName} · PO {receipt.poNumber} · Invoice {receipt.invoiceNumber}
                  </div>
                </div>
                <StatusBadge status={receipt.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[9px] text-slate-400">Received</div>
                  <div className="text-[12px] font-bold text-emerald-600">{receipt.stockUnits}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[9px] text-slate-400">Damaged</div>
                  <div className="text-[12px] font-bold text-rose-600">{receipt.damagedUnits}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[9px] text-slate-400">Employee</div>
                  <div className="truncate text-[10px] font-bold text-slate-600">{receipt.employee}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setSelectedReceiptId(receipt.id)}
                  className="text-[10px] font-bold text-indigo-600"
                >
                  View line details
                </button>
                {receipt.status === "draft" ? (
                  <button
                    onClick={() => void approve(receipt)}
                    disabled={saving}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-bold text-white disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3" /> Approve
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#fafbfe] text-[9px] uppercase tracking-[.1em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Receipt</th>
                <th className="px-3 py-3">Supplier / PO</th>
                <th className="px-3 py-3">Invoice</th>
                <th className="px-3 py-3">Received</th>
                <th className="px-3 py-3">Damaged</th>
                <th className="px-3 py-3">Employee</th>
                <th className="px-3 py-3">Date / time</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceivings.map((receipt) => (
                <tr key={receipt.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-[11px] font-bold text-indigo-600">#{receipt.receiptNumber}</td>
                  <td className="px-3 py-3">
                    <div className="text-[11px] font-semibold text-slate-700">{receipt.supplierName}</div>
                    <div className="text-[9px] text-slate-400">PO {receipt.poNumber}</div>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{receipt.invoiceNumber}</td>
                  <td className="px-3 py-3 text-[11px] font-bold text-emerald-600">+{receipt.stockUnits}</td>
                  <td className="px-3 py-3 text-[11px] font-bold text-rose-600">{receipt.damagedUnits}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{receipt.employee}</td>
                  <td className="px-3 py-3 text-[10px] text-slate-400">{new Date(receipt.receivedAt).toLocaleString()}</td>
                  <td className="px-3 py-3"><StatusBadge status={receipt.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedReceiptId(receipt.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Details
                      </button>
                      {receipt.status === "draft" ? (
                        <button
                          onClick={() => void approve(receipt)}
                          disabled={saving}
                          className="text-[10px] font-bold text-emerald-600 hover:underline disabled:opacity-50"
                        >
                          Approve
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredReceivings.length ? (
          <div className="px-6 py-10 text-center text-[11px] text-slate-400">No receiving history yet.</div>
        ) : null}
      </div>
      ) : null}

      {receivingMode && selectedReceipt ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="flex items-start justify-between border-b border-slate-100 p-4">
            <div>
              <div className="text-[14px] font-bold text-[#14203a]">
                Receipt #{selectedReceipt.receiptNumber} · Invoice {selectedReceipt.invoiceNumber}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                {selectedReceipt.supplierName} · PO {selectedReceipt.poNumber} · {new Date(selectedReceipt.receivedAt).toLocaleString()}
              </div>
            </div>
            <button onClick={() => setSelectedReceiptId(null)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100">
              <X className="size-4 text-slate-500" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[9px] uppercase tracking-[.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-3 py-2.5">Expected</th>
                  <th className="px-3 py-2.5">Remaining before</th>
                  <th className="px-3 py-2.5">Received</th>
                  <th className="px-3 py-2.5">Damaged</th>
                  <th className="px-3 py-2.5">Missing</th>
                  <th className="px-3 py-2.5">Difference</th>
                  <th className="px-3 py-2.5">Cost</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.items.map((line) => (
                  <tr key={line.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-bold text-slate-700">{line.title}</div>
                      <div className="text-[9px] text-slate-400">{line.sku || "—"}</div>
                      {line.overageQuantity > 0 ? (
                        <div className="mt-1 text-[9px] font-semibold text-amber-600">
                          Excess +{line.overageQuantity}: {line.overageReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-600">{line.expectedQuantity}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-600">{line.remainingQuantityBefore}</td>
                    <td className="px-3 py-3 text-[11px] font-bold text-emerald-600">{line.receivedQuantity}</td>
                    <td className="px-3 py-3 text-[11px] font-bold text-rose-600">{line.damagedQuantity}</td>
                    <td className="px-3 py-3 text-[11px] font-bold text-rose-600">{line.missingQuantity}</td>
                    <td className={`px-3 py-3 text-[11px] font-bold ${line.difference > 0 ? "text-amber-600" : "text-slate-600"}`}>
                      {line.difference}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-600">{money(line.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <div className="text-[10px] text-slate-400">
              Approved stock: <b className="text-emerald-600">{selectedReceipt.stockUnits}</b> · Damaged:{" "}
              <b className="text-rose-600">{selectedReceipt.damagedUnits}</b>
            </div>
            {selectedReceipt.status === "approved" ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Stock and inventory movement recorded atomically
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
          Last refresh warning: {error}
        </div>
      ) : null}
    </div>
  );
}
