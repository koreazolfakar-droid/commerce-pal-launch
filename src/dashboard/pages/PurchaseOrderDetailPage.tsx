import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  ClipboardList,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  deleteProcurementAttachment,
  issuePurchaseOrder,
  loadReceivingWorkspace,
  rejectPurchaseOrder,
  reopenPurchaseOrder,
  submitPurchaseOrder,
  uploadProcurementAttachment,
  type ProcurementAttachment,
  type ProcurementEventSummary,
  type PurchaseOrderSummary,
  type ReceivingSupplier,
} from "@/dashboard/data/receiving";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "received"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "partially_received"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : status === "ordered"
          ? "bg-violet-50 text-violet-700 ring-violet-100"
          : status === "draft"
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">{label}</div>
      <div className="mt-1 text-[12px] font-semibold text-slate-700">{value}</div>
    </div>
  );
}

export default function PurchaseOrderDetailPage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [po, setPo] = useState<PurchaseOrderSummary | null>(null);
  const [supplier, setSupplier] = useState<ReceivingSupplier | null>(null);
  const [events, setEvents] = useState<ProcurementEventSummary[]>([]);
  const [attachments, setAttachments] = useState<ProcurementAttachment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attachmentType, setAttachmentType] = useState<"purchase_order" | "supplier_invoice" | "packing_list" | "other">("purchase_order");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const workspace = await loadReceivingWorkspace();
      const found = workspace.purchaseOrders.find((item) => item.id === id) ?? null;
      setPo(found);
      setSupplier(found ? workspace.suppliers.find((item) => item.id === found.supplierId) ?? null : null);
      setEvents(
        workspace.events
          .filter((event) => event.purchaseOrderId === id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
      setAttachments(workspace.attachments.filter((attachment) => attachment.purchaseOrderId === id));
      setIsAdmin(workspace.role === "admin");
      setError(found ? "" : "Purchase order was not found.");
      if (manual && found) toast.success("Purchase order refreshed.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to load purchase order.";
      setError(message);
      if (manual) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const submit = async () => {
    if (!po || po.status !== "draft") return;
    if (!window.confirm(`Submit PO ${po.poNumber}? Draft lines will become locked for receiving.`)) return;

    setSaving(true);
    try {
      await submitPurchaseOrder(po.id);
      toast.success(`PO ${po.poNumber} submitted for approval.`);
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "PO submission failed.");
    } finally {
      setSaving(false);
    }
  };

  const runLifecycle = async (
    action: "approve" | "issue" | "reject" | "reopen" | "cancel",
  ) => {
    if (!po) return;
    setSaving(true);
    try {
      if (action === "approve") {
        await approvePurchaseOrder(po.id);
        toast.success(`PO ${po.poNumber} approved.`);
      } else if (action === "issue") {
        await issuePurchaseOrder(po.id);
        toast.success(`PO ${po.poNumber} issued and ready for receiving.`);
      } else if (action === "reopen") {
        await reopenPurchaseOrder(po.id);
        toast.success(`PO ${po.poNumber} reopened as draft.`);
      } else if (action === "reject") {
        const reason = window.prompt("Reason for rejecting this purchase order?")?.trim();
        if (!reason) return;
        await rejectPurchaseOrder(po.id, reason);
        toast.success(`PO ${po.poNumber} rejected.`);
      } else {
        const reason = window.prompt("Reason for cancelling this purchase order?")?.trim();
        if (!reason) return;
        await cancelPurchaseOrder(po.id, reason);
        toast.success(`PO ${po.poNumber} cancelled.`);
      }
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Purchase order action failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (file: File | null) => {
    if (!po || !file) return;
    setSaving(true);
    try {
      await uploadProcurementAttachment({
        file,
        purchaseOrderId: po.id,
        attachmentType,
      });
      toast.success("Attachment uploaded.");
      await load(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Attachment upload failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[440px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">Purchase order could not be opened.</div>
        <div className="mt-1 text-xs text-rose-600">{error || "Purchase order was not found."}</div>
        <button
          onClick={() => navigate("/dashboard/purchase-orders")}
          className="mt-4 rounded-xl bg-[#14203a] px-4 py-2 text-[11px] font-bold text-white"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  const canReceive = po.status === "ordered" || po.status === "partially_received";
  const progress = po.expectedUnits > 0 ? Math.min(100, Math.round((po.receivedUnits / po.expectedUnits) * 100)) : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <button
            onClick={() => navigate("/dashboard/purchase-orders")}
            className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="size-3.5" />
            Purchase Orders
          </button>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Commerce / Procurement
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">{po.poNumber}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Purchase order details and ordered items. Receiving remains a separate workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600"
          >
            <Printer className="size-3.5" />
            Print / PDF
          </button>

          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {po.status === "draft" ? (
            <>
              <button
                onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"
              >
                Edit PO
              </button>
              <button
                onClick={() => void submit()}
                disabled={saving}
                className="h-10 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white disabled:opacity-50"
              >
                Submit for approval
              </button>
            </>
          ) : null}

          {po.status === "pending_approval" && isAdmin ? (
            <>
              <button
                onClick={() => void runLifecycle("reject")}
                disabled={saving}
                className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[11px] font-bold text-rose-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => void runLifecycle("approve")}
                disabled={saving}
                className="h-10 rounded-xl bg-emerald-600 px-4 text-[11px] font-bold text-white disabled:opacity-50"
              >
                Approve PO
              </button>
            </>
          ) : null}

          {po.status === "approved" && isAdmin ? (
            <button
              onClick={() => void runLifecycle("issue")}
              disabled={saving}
              className="h-10 rounded-xl bg-violet-600 px-4 text-[11px] font-bold text-white disabled:opacity-50"
            >
              Issue PO
            </button>
          ) : null}

          {po.status === "rejected" && isAdmin ? (
            <button
              onClick={() => void runLifecycle("reopen")}
              disabled={saving}
              className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-[11px] font-bold text-amber-700 disabled:opacity-50"
            >
              Reopen draft
            </button>
          ) : null}

          {canReceive ? (
            <button
              onClick={() => navigate(`/dashboard/receiving/${po.id}`)}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
            >
              <PackageCheck className="size-3.5" />
              Receive PO
            </button>
          ) : null}

          {isAdmin && ["draft", "pending_approval", "approved", "ordered"].includes(po.status) ? (
            <button
              onClick={() => void runLifecycle("cancel")}
              disabled={saving}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-500 disabled:opacity-50"
            >
              Cancel PO
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoItem
          label="Supplier"
          value={
            <div>
              <div>{po.supplierName}</div>
              {supplier?.phone || supplier?.email ? (
                <div className="mt-1 text-[9px] font-medium text-slate-400">
                  {[supplier.phone, supplier.email].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
          }
        />
        <InfoItem label="Store / Warehouse" value={po.locationName} />
        <InfoItem label="Created date" value={new Date(po.createdAt).toLocaleString()} />
        <InfoItem label="Expected delivery" value={po.expectedAt ? new Date(po.expectedAt).toLocaleString() : "—"} />
        <InfoItem label="Issued date" value={po.orderedAt ? new Date(po.orderedAt).toLocaleString() : "—"} />
        <InfoItem label="Approved date" value={po.approvedAt ? new Date(po.approvedAt).toLocaleString() : "—"} />
        <InfoItem label="Currency / FX" value={`${po.currency} · ${po.exchangeRate.toLocaleString()}`} />
        <InfoItem label="Final total" value={money(po.grandTotal, po.currency)} />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">
            <ClipboardList className="size-3.5" />
            Ordered
          </div>
          <div className="mt-2 text-2xl font-bold text-[#14203a]">{po.expectedUnits}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-emerald-600">
            <Boxes className="size-3.5" />
            Received
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{po.receivedUnits}</div>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-indigo-600">
            <Truck className="size-3.5" />
            Remaining
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">{po.remainingUnits}</div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="Subtotal" value={money(po.subtotal, po.currency)} />
        <InfoItem label="Discount" value={money(po.discountAmount, po.currency)} />
        <InfoItem label="VAT / Tax" value={money(po.taxAmount, po.currency)} />
        <InfoItem label="Shipping" value={money(po.shippingAmount, po.currency)} />
      </div>

      {po.rejectionReason ? (
        <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-[11px] text-rose-700">
          <b>Rejection reason:</b> {po.rejectionReason}
        </div>
      ) : null}

      {po.cancellationReason ? (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-[11px] text-slate-600">
          <b>Cancellation reason:</b> {po.cancellationReason}
        </div>
      ) : null}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-bold text-[#14203a]">Receiving progress</div>
            <div className="mt-1 text-[10px] text-slate-400">
              {po.receivedUnits} received from {po.expectedUnits} ordered units
            </div>
          </div>
          <div className="text-[12px] font-bold text-indigo-600">{progress}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="text-[14px] font-bold text-[#14203a]">Purchase order items</div>
            <div className="mt-1 text-[10px] text-slate-400">Ordered quantity, received quantity, remaining quantity and unit cost</div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <CalendarDays className="size-3.5" />
            {po.items.length} items
          </div>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">
          {po.items.map((item) => (
            <article key={item.id} className="p-4">
              <div className="text-[12px] font-bold text-slate-800">{item.title}</div>
              <div className="mt-1 font-mono text-[9px] text-slate-400">{item.sku || "No SKU"}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[9px] text-slate-400">Ordered</div>
                  <div className="text-[12px] font-bold text-slate-700">{item.expectedQuantity}</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <div className="text-[9px] text-emerald-500">Received</div>
                  <div className="text-[12px] font-bold text-emerald-700">{item.approvedReceivedQuantity}</div>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2">
                  <div className="text-[9px] text-indigo-500">Remaining</div>
                  <div className="text-[12px] font-bold text-indigo-700">{item.remainingQuantity}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Unit cost</span>
                <span className="font-bold text-slate-700">{money(item.unitCost, po.currency)}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[#fafbfe] text-[9px] uppercase tracking-[.1em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Ordered qty</th>
                <th className="px-3 py-3">Received qty</th>
                <th className="px-3 py-3">Remaining</th>
                <th className="px-5 py-3 text-right">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-[11px] font-bold text-slate-700">{item.title}</td>
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-400">{item.sku || "—"}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{item.expectedQuantity}</td>
                  <td className="px-3 py-3 text-[11px] font-bold text-emerald-600">{item.approvedReceivedQuantity}</td>
                  <td className="px-3 py-3 text-[11px] font-bold text-indigo-600">{item.remainingQuantity}</td>
                  <td className="px-5 py-3 text-right text-[11px] font-bold text-slate-700">
                    {money(item.unitCost, po.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {po.notes ? (
          <div className="border-t border-slate-100 p-4">
            <div className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">Notes</div>
            <div className="mt-1 text-[11px] text-slate-600">{po.notes}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[14px] font-bold text-[#14203a]">Documents & attachments</div>
              <div className="mt-1 text-[10px] text-slate-400">PO, supplier invoice and packing-list files.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={attachmentType}
                onChange={(event) => setAttachmentType(event.target.value as typeof attachmentType)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
              >
                <option value="purchase_order">Purchase order</option>
                <option value="supplier_invoice">Supplier invoice</option>
                <option value="packing_list">Packing list</option>
                <option value="other">Other</option>
              </select>
              <label className="cursor-pointer rounded-lg bg-[#14203a] px-3 py-2 text-[10px] font-bold text-white">
                Upload file
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/*"
                  disabled={saving}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void uploadAttachment(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    {attachment.fileName}
                  </a>
                  <div className="mt-1 text-[9px] text-slate-400">
                    {attachment.attachmentType.replaceAll("_", " ")}
                    {attachment.sizeBytes != null ? ` · ${Math.ceil(attachment.sizeBytes / 1024)} KB` : ""}
                  </div>
                </div>
                {isAdmin ? (
                  <button
                    onClick={() => {
                      if (!window.confirm("Delete this attachment?")) return;
                      setSaving(true);
                      void deleteProcurementAttachment(attachment)
                        .then(() => load(false))
                        .catch((cause) => toast.error(cause instanceof Error ? cause.message : "Delete failed."))
                        .finally(() => setSaving(false));
                    }}
                    className="text-[10px] font-bold text-rose-600"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ))}
            {!attachments.length ? (
              <div className="p-6 text-center text-[10px] text-slate-400">No documents uploaded yet.</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="text-[14px] font-bold text-[#14203a]">PO timeline</div>
            <div className="mt-1 text-[10px] text-slate-400">Immutable procurement audit events.</div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-4">
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="relative pl-5">
                  <span className="absolute left-0 top-1 size-2 rounded-full bg-indigo-500" />
                  <div className="text-[10px] font-bold text-slate-700">
                    {event.type.replaceAll("_", " ")}
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {!events.length ? (
                <div className="py-6 text-center text-[10px] text-slate-400">No audit events yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
