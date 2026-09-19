import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  PackageCheck,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  approveReceiving,
  deleteProcurementAttachment,
  loadReceivingWorkspace,
  replaceReceivingSerials,
  uploadProcurementAttachment,
  voidReceiving,
  type ProcurementAttachment,
  type ReceivingSerialDraft,
  type ReceivingSummary,
  type ReceivingWorkspace,
} from "@/dashboard/data/receiving";

type SerialDraftRow = ReceivingSerialDraft & { key: string };

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "voided") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

export default function ReceivingDetailPage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [workspace, setWorkspace] = useState<ReceivingWorkspace | null>(null);
  const [receipt, setReceipt] = useState<ReceivingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serialDrafts, setSerialDrafts] = useState<Record<string, SerialDraftRow[]>>({});
  const [attachmentType, setAttachmentType] = useState<"supplier_invoice" | "packing_list" | "other">("supplier_invoice");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadReceivingWorkspace();
      const found = next.receivings.find((item) => item.id === id) ?? null;
      if (!found) throw new Error("Receiving record was not found.");
      setWorkspace(next);
      setReceipt(found);
      setSerialDrafts(
        Object.fromEntries(
          found.items.map((line) => [
            line.id,
            line.serials.map((serial) => ({
              key: serial.id,
              serialNumber: serial.serialNumber,
              imei1: serial.imei1,
              imei2: serial.imei2,
              condition: serial.condition,
            })),
          ]),
        ),
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load receiving record.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const po = useMemo(
    () => workspace?.purchaseOrders.find((item) => item.id === receipt?.purchaseOrderId) ?? null,
    [receipt?.purchaseOrderId, workspace],
  );

  const attachments = useMemo(
    () => workspace?.attachments.filter((attachment) => attachment.receivingId === id) ?? [],
    [id, workspace],
  );

  const events = useMemo(
    () =>
      (workspace?.events ?? [])
        .filter((event) => event.receivingId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [id, workspace],
  );

  const invoiceTotal = useMemo(
    () => receipt?.items.reduce((sum, line) => sum + line.deliveredQuantity * line.unitCost, 0) ?? 0,
    [receipt],
  );

  const poBaselineTotal = useMemo(() => {
    if (!receipt || !po) return 0;
    return receipt.items.reduce((sum, line) => {
      const poLine = po.items.find((item) => item.id === line.purchaseOrderItemId);
      return sum + line.deliveredQuantity * (poLine?.unitCost ?? line.unitCost);
    }, 0);
  }, [po, receipt]);

  const saveSerials = async (lineId: string) => {
    setSaving(true);
    try {
      await replaceReceivingSerials(lineId, serialDrafts[lineId] ?? []);
      toast.success("Serial / IMEI data saved.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving serials failed.");
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!receipt) return;
    if (!window.confirm(`Approve receiving #${receipt.receiptNumber}? This will update stock.`)) return;
    setSaving(true);
    try {
      await approveReceiving(receipt.id);
      toast.success("Receiving approved and stock updated.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Approval failed.");
    } finally {
      setSaving(false);
    }
  };

  const voidDraft = async () => {
    if (!receipt) return;
    const reason = window.prompt("Reason for voiding this receiving draft?")?.trim();
    if (!reason) return;
    setSaving(true);
    try {
      await voidReceiving(receipt.id, reason);
      toast.success("Receiving draft voided.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Void failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (file: File | null) => {
    if (!receipt || !file) return;
    setSaving(true);
    try {
      await uploadProcurementAttachment({
        file,
        receivingId: receipt.id,
        attachmentType,
      });
      toast.success("Receiving document uploaded.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Upload failed.");
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

  if (error || !receipt || !workspace) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-700">Receiving could not be opened.</div>
        <div className="mt-1 text-xs text-rose-600">{error}</div>
        <button onClick={() => navigate("/dashboard/receiving")} className="mt-4 rounded-xl bg-[#14203a] px-4 py-2 text-[11px] font-bold text-white">
          Back to Receiving
        </button>
      </div>
    );
  }

  const currency = po?.currency ?? "USD";
  const priceVariance = invoiceTotal - poBaselineTotal;

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <button onClick={() => navigate("/dashboard/receiving")} className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <ArrowLeft className="size-3.5" /> Receiving
          </button>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Commerce / Receiving</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Receipt #{receipt.receiptNumber}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(receipt.status)}`}>
              {receipt.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Invoice {receipt.invoiceNumber} · PO {receipt.poNumber} · {receipt.supplierName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/dashboard/purchase-orders/${receipt.purchaseOrderId}`)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"
          >
            Open PO
          </button>
          {receipt.status === "draft" ? (
            <>
              <button onClick={() => void voidDraft()} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[11px] font-bold text-rose-700 disabled:opacity-50">
                <XCircle className="size-3.5" /> Void draft
              </button>
              <button onClick={() => void approve()} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[11px] font-bold text-white disabled:opacity-50">
                <CheckCircle2 className="size-3.5" /> Approve receiving
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Supplier", receipt.supplierName],
          ["PO Number", receipt.poNumber],
          ["Invoice Number", receipt.invoiceNumber],
          ["Receiving Employee", receipt.employee],
          ["Received At", new Date(receipt.receivedAt).toLocaleString()],
          ["Approved At", receipt.approvedAt ? new Date(receipt.approvedAt).toLocaleString() : "—"],
          ["Usable Units", String(receipt.stockUnits)],
          ["Damaged Units", String(receipt.damagedUnits)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-400">{label}</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-700">{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">Supplier invoice value</div>
          <div className="mt-2 text-xl font-bold text-[#14203a]">{money(invoiceTotal, currency)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">PO baseline for delivered qty</div>
          <div className="mt-2 text-xl font-bold text-[#14203a]">{money(poBaselineTotal, currency)}</div>
        </div>
        <div className={`rounded-2xl border p-4 ${priceVariance === 0 ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"}`}>
          <div className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">Price variance</div>
          <div className={`mt-2 text-xl font-bold ${priceVariance === 0 ? "text-emerald-700" : "text-amber-700"}`}>
            {priceVariance >= 0 ? "+" : ""}{money(priceVariance, currency)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <div className="text-[14px] font-bold text-[#14203a]">Receiving lines & invoice matching</div>
          <div className="mt-1 text-[10px] text-slate-400">PO cost vs invoice cost, quantity variance and serial / IMEI tracking.</div>
        </div>
        <div className="divide-y divide-slate-100">
          {receipt.items.map((line) => {
            const poLine = po?.items.find((item) => item.id === line.purchaseOrderItemId);
            const rowPriceVariance = line.unitCost - (poLine?.unitCost ?? line.unitCost);
            const rows = serialDrafts[line.id] ?? [];
            const trackedCount = rows.filter((row) => row.serialNumber?.trim() || row.imei1?.trim() || row.imei2?.trim()).length;
            return (
              <div key={line.id} className="p-4">
                <div className="grid gap-3 lg:grid-cols-[1.3fr_repeat(7,minmax(80px,.55fr))] lg:items-start">
                  <div>
                    <div className="text-[12px] font-bold text-slate-800">{line.title}</div>
                    <div className="mt-1 font-mono text-[9px] text-slate-400">{line.sku || "No SKU"}</div>
                  </div>
                  {[
                    ["Expected", line.expectedQuantity],
                    ["Remaining before", line.remainingQuantityBefore],
                    ["Received", line.receivedQuantity],
                    ["Damaged", line.damagedQuantity],
                    ["Missing", line.missingQuantity],
                    ["Difference", line.difference],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[8px] font-bold uppercase text-slate-400">{label}</div>
                      <div className="mt-1 text-[11px] font-bold text-slate-700">{value}</div>
                    </div>
                  ))}
                  <div>
                    <div className="text-[8px] font-bold uppercase text-slate-400">Invoice cost</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-700">{money(line.unitCost, currency)}</div>
                    <div className={`mt-1 text-[9px] font-bold ${rowPriceVariance === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {rowPriceVariance === 0 ? "Matches PO" : `${rowPriceVariance > 0 ? "+" : ""}${money(rowPriceVariance, currency)} / unit`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-700">Serial / IMEI tracking</div>
                      <div className="mt-1 text-[9px] text-slate-400">
                        {trackedCount} identifier row(s) · physical delivered qty {line.deliveredQuantity}
                      </div>
                    </div>
                    {receipt.status === "draft" ? (
                      <button
                        onClick={() =>
                          setSerialDrafts((current) => ({
                            ...current,
                            [line.id]: [
                              ...(current[line.id] ?? []),
                              { key: crypto.randomUUID(), serialNumber: "", imei1: "", imei2: "", condition: "usable" },
                            ],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600"
                      >
                        <Plus className="size-3" /> Add serial
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {rows.map((row) => (
                      <div key={row.key} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_120px_36px]">
                        <input
                          value={row.serialNumber ?? ""}
                          readOnly={receipt.status !== "draft"}
                          onChange={(e) => setSerialDrafts((current) => ({ ...current, [line.id]: (current[line.id] ?? []).map((item) => item.key === row.key ? { ...item, serialNumber: e.target.value } : item) }))}
                          placeholder="Serial number"
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
                        />
                        <input
                          value={row.imei1 ?? ""}
                          readOnly={receipt.status !== "draft"}
                          onChange={(e) => setSerialDrafts((current) => ({ ...current, [line.id]: (current[line.id] ?? []).map((item) => item.key === row.key ? { ...item, imei1: e.target.value } : item) }))}
                          placeholder="IMEI 1"
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
                        />
                        <input
                          value={row.imei2 ?? ""}
                          readOnly={receipt.status !== "draft"}
                          onChange={(e) => setSerialDrafts((current) => ({ ...current, [line.id]: (current[line.id] ?? []).map((item) => item.key === row.key ? { ...item, imei2: e.target.value } : item) }))}
                          placeholder="IMEI 2"
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
                        />
                        <select
                          value={row.condition ?? "usable"}
                          disabled={receipt.status !== "draft"}
                          onChange={(e) => setSerialDrafts((current) => ({ ...current, [line.id]: (current[line.id] ?? []).map((item) => item.key === row.key ? { ...item, condition: e.target.value as "usable" | "damaged" } : item) }))}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]"
                        >
                          <option value="usable">Usable</option>
                          <option value="damaged">Damaged</option>
                        </select>
                        {receipt.status === "draft" ? (
                          <button
                            onClick={() => setSerialDrafts((current) => ({ ...current, [line.id]: (current[line.id] ?? []).filter((item) => item.key !== row.key) }))}
                            className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                            aria-label="Remove serial"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                    {!rows.length ? <div className="text-[9px] text-slate-400">No serial / IMEI data recorded for this line.</div> : null}
                  </div>

                  {receipt.status === "draft" ? (
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => void saveSerials(line.id)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#14203a] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                        <Save className="size-3" /> Save serials
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#14203a]"><FileText className="size-4" /> Receiving documents</div>
              <div className="mt-1 text-[10px] text-slate-400">Supplier invoice and packing-list attachments.</div>
            </div>
            <div className="flex gap-2">
              <select value={attachmentType} onChange={(e) => setAttachmentType(e.target.value as typeof attachmentType)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]">
                <option value="supplier_invoice">Supplier invoice</option>
                <option value="packing_list">Packing list</option>
                <option value="other">Other</option>
              </select>
              <label className="cursor-pointer rounded-lg bg-[#14203a] px-3 py-2 text-[10px] font-bold text-white">
                Upload
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void uploadAttachment(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {attachments.map((attachment: ProcurementAttachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 p-4">
                <a href={attachment.url} target="_blank" rel="noreferrer" className="truncate text-[11px] font-bold text-indigo-600 hover:underline">
                  {attachment.fileName}
                </a>
                {workspace.role === "admin" ? (
                  <button
                    onClick={() => {
                      if (!window.confirm("Delete this attachment?")) return;
                      setSaving(true);
                      void deleteProcurementAttachment(attachment)
                        .then(() => load())
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
            {!attachments.length ? <div className="p-6 text-center text-[10px] text-slate-400">No receiving documents yet.</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="text-[14px] font-bold text-[#14203a]">Receiving timeline</div>
            <div className="mt-1 text-[10px] text-slate-400">Draft, approval and void events.</div>
          </div>
          <div className="space-y-4 p-4">
            {events.map((event) => (
              <div key={event.id} className="relative pl-5">
                <span className="absolute left-0 top-1 size-2 rounded-full bg-indigo-500" />
                <div className="text-[10px] font-bold text-slate-700">{event.type.replaceAll("_", " ")}</div>
                <div className="mt-1 text-[9px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {!events.length ? <div className="py-6 text-center text-[10px] text-slate-400">No events yet.</div> : null}
          </div>
        </div>
      </div>

      {receipt.status === "approved" ? (
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-[11px] font-semibold text-emerald-700">
          <PackageCheck className="size-4" />
          Stock and inventory movements were recorded when this receiving was approved.
        </div>
      ) : null}
    </div>
  );
}
