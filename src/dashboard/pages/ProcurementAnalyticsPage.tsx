import { useLanguage } from "@/dashboard/i18n";
import DashboardResponsiveTable from "@/dashboard/components/DashboardResponsiveTable";
import { AlertTriangle, BarChart3, Boxes, Loader2, RefreshCw, ShoppingCart, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  buildProcurementAnalytics,
  buildReorderSuggestions,
  loadReceivingWorkspace,
  type ReceivingWorkspace,
} from "@/dashboard/data/receiving";

export default function ProcurementAnalyticsPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const money = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value);
  const [, navigate] = useLocation();
  const [workspace, setWorkspace] = useState<ReceivingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetStock, setTargetStock] = useState("10");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const parsedTarget = /^\d+$/.test(targetStock.trim()) ? Number(targetStock) : NaN;
  const validTarget = Number.isSafeInteger(parsedTarget) && parsedTarget > 0;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const next = await loadReceivingWorkspace({
        includeAudit: false,
        includeSerials: false,
      });
      if (request !== requestId.current) return;
      setWorkspace(next);
      setUpdatedAt(new Date());
    } catch (cause) {
      if (request !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : "Unable to load procurement analytics.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const analytics = useMemo(
    () => (workspace ? buildProcurementAnalytics(workspace) : null),
    [workspace],
  );
  const suggestions = useMemo(
    () => (workspace && validTarget ? buildReorderSuggestions(workspace, parsedTarget) : []),
    [parsedTarget, validTarget, workspace],
  );

  if (loading && !workspace) {
    return (
      <div role="status" aria-busy="true" className="grid min-h-[320px] place-items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
        {lang === "ar" ? "جارٍ تحميل بيانات المشتريات…" : "Loading procurement data…"}
      </div>
    );
  }

  if (!workspace || !analytics) {
    return (
      <div role="alert" className="rounded-2xl border border-border bg-card p-6 text-sm text-foreground">
        <h1 className="font-semibold">{t("Procurement Analytics")}</h1>
        <p className="mt-2 break-words text-muted-foreground">{t(error || "Unable to load procurement analytics.")}</p>
        <button type="button" onClick={() => void load()} disabled={loading} className="dashboard-button mt-4">
          {t("Retry")}
        </button>
      </div>
    );
  }

  const cards = [
    { label: "Purchase spend", value: money(analytics.totalSpend), icon: BarChart3 },
    { label: "Open POs", value: analytics.openPoCount.toLocaleString(locale), icon: ShoppingCart },
    { label: "Overdue POs", value: analytics.overduePoCount.toLocaleString(locale), icon: AlertTriangle },
    { label: "Damage rate", value: `${(analytics.damageRate * 100).toFixed(1)}%`, icon: Boxes },
  ];

  return (
    <div aria-busy={loading}>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
            {t("Commerce / Procurement")}
          </div>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-.05em] text-foreground">
            {t("Procurement Analytics")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Spend in USD at each PO’s saved exchange rate, delivery risk, supplier activity and reorder suggestions.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="dashboard-button">
            <RefreshCw aria-hidden="true" className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {t("Refresh")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/purchase-orders/new")}
            className="dashboard-button dashboard-button-primary"
          >
            {t("Create Purchase Order")}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p>{lang === "ar" ? "تعذّر التحديث. البيانات المعروضة من آخر تحميل ناجح." : "Refresh failed. Showing the last successfully loaded data."}</p>
          <p className="mt-1 break-words">{t(error)}</p>
        </div>
      )}
      <p role="status" className="mb-4 text-xs text-muted-foreground">
        {loading
          ? (lang === "ar" ? "جارٍ تحديث البيانات…" : "Updating data…")
          : updatedAt
            ? `${t("Updated")} ${updatedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
            : ""}
      </p>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground">{t(label)}</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2 text-[14px] font-bold text-foreground">
              <Truck className="size-4" /> {t("Supplier spend")}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {t("PO value in USD using the saved exchange rates.")}
            </div>
          </div>
          <div className="divide-y divide-border">
            {analytics.supplierSpend.slice(0, 12).map((supplier) => (
              <div
                key={supplier.supplierId}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              >
                <div>
                  <div className="text-[11px] font-bold text-foreground">
                    {supplier.supplierName}
                  </div>
                  <div className="mt-1 text-[9px] text-muted-foreground">
                    {supplier.poCount} {t("POs ·")} {supplier.completedPoCount} {t("completed ·")}{" "}
                    {supplier.damagedUnits} {t("damaged units")}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {t("On-time")}
                  <b
                    className={
                      supplier.completedPoCount > 0 && supplier.onTimeRate < 0.8
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }
                  >
                    {supplier.completedPoCount > 0 ? `${(supplier.onTimeRate * 100).toFixed(0)}%` : "—"}
                  </b>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {supplier.poCount} {t("POs")}
                </div>
                <div className="text-[11px] font-bold text-foreground">{money(supplier.spend)}</div>
              </div>
            ))}
            {!analytics.supplierSpend.length ? (
              <div className="p-6 text-center text-[10px] text-muted-foreground">
                {t("No purchasing data yet.")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-[14px] font-bold text-foreground">{t("Receiving quality")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {t("Approved receiving units and damaged units.")}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="text-[10px] text-emerald-600">{t("Usable received")}</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {analytics.receivedUnits}
              </div>
            </div>
            <div className="rounded-xl bg-rose-50 p-4">
              <div className="text-[10px] text-rose-600">{t("Damaged")}</div>
              <div className="mt-1 text-2xl font-bold text-rose-700">{analytics.damagedUnits}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[14px] font-bold text-foreground">{t("Suggested reorder")}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {t("Uses current stock plus quantities already on open purchase orders.")}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
            {t("Target stock")}
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={targetStock}
              onChange={(e) => setTargetStock(e.target.value)}
              aria-invalid={!validTarget}
              aria-describedby={!validTarget ? "procurement-target-error" : undefined}
              className="h-11 w-24 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
        </div>
        {!validTarget && (
          <p id="procurement-target-error" role="alert" className="px-4 py-3 text-sm text-destructive">
            {lang === "ar" ? "أدخل عدداً صحيحاً أكبر من صفر للمخزون المستهدف." : "Enter a whole target stock quantity greater than zero."}
          </p>
        )}
        <div className="overflow-x-auto">
          <DashboardResponsiveTable>
            <table className="w-full min-w-[900px] text-start">
              <thead className="bg-muted/50 text-[9px] uppercase tracking-[.08em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t("Product / Variant")}</th>
                  <th className="px-3 py-3">{t("SKU")}</th>
                  <th className="px-3 py-3">{t("Stock")}</th>
                  <th className="px-3 py-3">{t("On order")}</th>
                  <th className="px-3 py-3">{t("Projected")}</th>
                  <th className="px-3 py-3">{t("Suggested supplier")}</th>
                  <th className="px-5 py-3 text-end">{t("Suggested qty")}</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((item) => (
                  <tr key={item.key} className="border-t border-border">
                    <td className="px-5 py-3 text-[11px] font-bold text-foreground">{item.title}</td>
                    <td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">
                      {item.sku || "—"}
                    </td>
                    <td className="px-3 py-3 text-[11px] font-bold text-rose-600">
                      {item.currentStock}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-blue-600">{item.onOrder}</td>
                    <td className="px-3 py-3 text-[11px] text-muted-foreground">
                      {item.currentStock + item.onOrder}
                    </td>
                    <td className="px-3 py-3 text-[10px] font-semibold text-muted-foreground">
                      {item.recommendedSupplierName ?? t("No supplier history")}
                    </td>
                    <td className="px-5 py-3 text-end text-[11px] font-bold text-primary">
                      {item.suggestedQuantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardResponsiveTable>
        </div>
        {validTarget && !suggestions.length ? (
          <div className="p-8 text-center text-[11px] text-emerald-600">
            {t("No products are below the selected projected stock target.")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
