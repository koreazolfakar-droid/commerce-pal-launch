import { AlertTriangle, BarChart3, Boxes, Loader2, ShoppingCart, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  buildProcurementAnalytics,
  buildReorderSuggestions,
  loadReceivingWorkspace,
  type ReceivingWorkspace,
} from "@/dashboard/data/receiving";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function ProcurementAnalyticsPage() {
  const [, navigate] = useLocation();
  const [workspace, setWorkspace] = useState<ReceivingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetStock, setTargetStock] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkspace(
        await loadReceivingWorkspace({
          includeAudit: false,
          includeSerials: false,
        }),
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load procurement analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const analytics = useMemo(
    () => (workspace ? buildProcurementAnalytics(workspace) : null),
    [workspace],
  );
  const suggestions = useMemo(
    () => (workspace ? buildReorderSuggestions(workspace, targetStock) : []),
    [targetStock, workspace],
  );

  if (loading && !workspace) {
    return <div className="grid min-h-[440px] place-items-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="size-6 animate-spin text-indigo-600" /></div>;
  }

  if (!workspace || !analytics) return null;

  const cards = [
    { label: "Purchase spend", value: money(analytics.totalSpend), icon: BarChart3 },
    { label: "Open POs", value: analytics.openPoCount.toLocaleString(), icon: ShoppingCart },
    { label: "Overdue POs", value: analytics.overduePoCount.toLocaleString(), icon: AlertTriangle },
    { label: "Damage rate", value: `${(analytics.damageRate * 100).toFixed(1)}%`, icon: Boxes },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Commerce / Procurement</div>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Procurement Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Spend, delivery risk, supplier activity and reorder suggestions from live PO data.</p>
        </div>
        <button onClick={() => navigate("/dashboard/purchase-orders/new")} className="h-10 rounded-xl bg-[#14203a] px-4 text-[11px] font-bold text-white">Create Purchase Order</button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">{label}</div>
                <div className="mt-1 text-2xl font-bold text-[#14203a]">{value}</div>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="size-5" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#14203a]"><Truck className="size-4" /> Supplier spend</div>
            <div className="mt-1 text-[10px] text-slate-400">Active and historical PO value by supplier.</div>
          </div>
          <div className="divide-y divide-slate-100">
            {analytics.supplierSpend.slice(0, 12).map((supplier) => (
              <div key={supplier.supplierId} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">{supplier.supplierName}</div>
                  <div className="mt-1 text-[9px] text-slate-400">
                    {supplier.poCount} POs · {supplier.completedPoCount} completed · {supplier.damagedUnits} damaged units
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  On-time <b className={supplier.completedPoCount > 0 && supplier.onTimeRate < 0.8 ? "text-amber-600" : "text-emerald-600"}>
                    {(supplier.onTimeRate * 100).toFixed(0)}%
                  </b>
                </div>
                <div className="text-[10px] text-slate-400">{supplier.poCount} POs</div>
                <div className="text-[11px] font-bold text-slate-700">{money(supplier.spend)}</div>
              </div>
            ))}
            {!analytics.supplierSpend.length ? <div className="p-6 text-center text-[10px] text-slate-400">No purchasing data yet.</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[14px] font-bold text-[#14203a]">Receiving quality</div>
          <div className="mt-1 text-[10px] text-slate-400">Approved receiving units and damaged units.</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-4"><div className="text-[10px] text-emerald-600">Usable received</div><div className="mt-1 text-2xl font-bold text-emerald-700">{analytics.receivedUnits}</div></div>
            <div className="rounded-xl bg-rose-50 p-4"><div className="text-[10px] text-rose-600">Damaged</div><div className="mt-1 text-2xl font-bold text-rose-700">{analytics.damagedUnits}</div></div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#14203a]">Suggested reorder</div>
            <div className="mt-1 text-[10px] text-slate-400">Uses current stock plus quantities already on open purchase orders.</div>
          </div>
          <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
            Target stock
            <input type="number" min={1} value={targetStock} onChange={(e) => setTargetStock(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-[11px]" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[9px] uppercase tracking-[.08em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Product / Variant</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">On order</th>
                <th className="px-3 py-3">Projected</th>
                <th className="px-3 py-3">Suggested supplier</th>
                <th className="px-5 py-3 text-right">Suggested qty</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((item) => (
                <tr key={item.key} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-[11px] font-bold text-slate-700">{item.title}</td>
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-400">{item.sku || "—"}</td>
                  <td className="px-3 py-3 text-[11px] font-bold text-rose-600">{item.currentStock}</td>
                  <td className="px-3 py-3 text-[11px] text-blue-600">{item.onOrder}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{item.currentStock + item.onOrder}</td>
                  <td className="px-3 py-3 text-[10px] font-semibold text-slate-600">{item.recommendedSupplierName ?? "No supplier history"}</td>
                  <td className="px-5 py-3 text-right text-[11px] font-bold text-indigo-600">{item.suggestedQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!suggestions.length ? <div className="p-8 text-center text-[11px] text-emerald-600">No products are below the selected projected stock target.</div> : null}
      </div>
    </div>
  );
}
