import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Package,
  PackageX,
  RefreshCw,
  ShoppingBag,
  Tags,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import { analyticsRange, type AnalyticsPeriod } from "@/dashboard/lib/analytics";
import { loadAnalyticsSnapshot } from "@/dashboard/data/analytics";
import { useAnalyticsResource } from "@/dashboard/hooks/useAnalyticsResource";
import { useDashboardRealtimeRefresh } from "@/dashboard/hooks/useDashboardRealtimeRefresh";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  SmartKpi,
} from "@/dashboard/components/analytics/AnalyticsPrimitives";
import AnalyticsContext from "@/dashboard/components/analytics/AnalyticsContext";
import AnalyticsCharts from "@/dashboard/components/analytics/AnalyticsCharts";
import InventoryAlertCenter from "@/dashboard/components/analytics/InventoryAlertCenter";
import ProductPerformance from "@/dashboard/components/analytics/ProductPerformance";
import "@/dashboard/components/analytics/analytics.css";

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const [anchor, setAnchor] = useState(() => new Date());
  const [period, setPeriod] = useState<AnalyticsPeriod>("30D");
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [compare, setCompare] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [revision, setRevision] = useState(0);
  const rangeResult = useMemo(() => {
    try {
      return { range: analyticsRange(period, anchor, from, to), error: "" };
    } catch (cause) {
      return {
        range: null,
        error: cause instanceof Error ? cause.message : "Choose valid start and end dates.",
      };
    }
  }, [period, anchor, from, to]);
  const { range } = rangeResult;
  const load = useCallback(
    (signal: AbortSignal) => loadAnalyticsSnapshot(range!, compare, currency, signal),
    [range, compare, currency],
  );
  const resource = useAnalyticsResource(
    JSON.stringify([range, compare, currency, revision]),
    load,
    !!range,
  );
  const { data, loading, error, updatedAt } = resource;
  const refresh = () => {
    setAnchor(new Date());
    setRevision((n) => n + 1);
  };
  useDashboardRealtimeRefresh(["store_sales", "store_orders", "store_product_variants"], () =>
    setRevision((n) => n + 1),
  );
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  const dateRange = (start: string, end: string) =>
    `${date(start)} – ${date(new Date(Date.parse(end) - 1).toISOString())}`;
  const integer = (n: number) => n.toLocaleString(locale);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(
      n,
    );
  const exportReport = () => {
    if (!data) return;
    const current = data.current,
      previous = data.previous;
    downloadCsv(`space-call-analytics-${data.periodStart.slice(0, 10)}.csv`, [
      [
        "Metric",
        "Value",
        "Previous period",
        "Currency",
        "Period start (UTC)",
        "Period end exclusive (UTC)",
      ],
      ...[
        ["Gross merchandise sales", current.grossSales, previous?.grossSales],
        ["Net merchandise sales", current.netSales, previous?.netSales],
        ["Orders created", current.orders, previous?.orders],
        ["Average completed order value", current.aov, previous?.aov],
      ].map(([name, value, prior]) => [
        name ?? "",
        value ?? "",
        prior ?? "",
        currency,
        data.periodStart,
        data.periodEnd,
      ]),
      ["Customers (current)", data.catalog.customers, "", "", "", ""],
      ["Products (current)", data.catalog.products, "", "", "", ""],
      ["Units on hand (current)", data.catalog.totalUnits, "", "", "", ""],
      ["Low stock (current)", data.catalog.lowStock, "", "", "", ""],
      ["Out of stock (current)", data.catalog.outOfStock, "", "", "", ""],
      ["Visible brands (current)", data.catalog.visibleBrands, "", "", "", ""],
      [
        "Note",
        "Net merchandise = subtotal minus discounts, before shipping. Full refunds excluded; partial refunds retain recorded values.",
        "",
        "",
        "",
        "",
      ],
    ]);
  };
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <PageTitle
          eyebrow="Store performance"
          title="Analytics"
          description="A clearer view of sales, stock and what comes next."
        />
        <div className="analytics-header-actions">
          <button type="button" className="analytics-button" onClick={refresh} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {t("Refresh")}
          </button>
          <button
            type="button"
            className="analytics-button primary"
            onClick={exportReport}
            disabled={!data || loading || !!error || !range}
          >
            <ArrowDownToLine className="size-4" />
            {t("Export report")}
          </button>
        </div>
      </header>
      <section className="analytics-toolbar" aria-label={t("Analytics filters")}>
        <div className="analytics-periods" role="group" aria-label={t("Report period")}>
          {(["7D", "30D", "90D", "12M", "custom"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {t(value === "custom" ? "Custom" : value)}
            </button>
          ))}
        </div>
        <div className="analytics-toolbar-options">
          <label className="analytics-compare">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            {t("Compare to previous period")}
          </label>
          <label>
            <span className="sr-only">{t("Report currency")}</span>
            <select
              aria-label={t("Report currency")}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {Array.from(new Set([currency, ...(data?.currencies ?? [])])).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        {period === "custom" && (
          <div className="analytics-custom-dates">
            <label>
              {t("Start date")}
              <input
                type="date"
                value={from}
                max={anchor.toISOString().slice(0, 10)}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <span aria-hidden="true">–</span>
            <label>
              {t("End date")}
              <input
                type="date"
                value={to}
                min={from}
                max={anchor.toISOString().slice(0, 10)}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        )}
      </section>
      {rangeResult.error && (
        <p className="analytics-error" role="alert">
          {t(rangeResult.error)}
        </p>
      )}
      {range && (
        <div className="analytics-report-meta">
          <span>
            <CalendarDays className="size-3.5" />
            {dateRange(range.start, range.end)} · UTC
          </span>
          {compare && (
            <span>
              {t("Compared with")} {dateRange(range.previousStart, range.previousEnd)}
            </span>
          )}
          {updatedAt && (
            <time dateTime={updatedAt.toISOString()}>
              {t("Updated")}{" "}
              {updatedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </time>
          )}
        </div>
      )}
      <p className="analytics-caption">
        {t("Sales and orders follow the selected period; catalog and stock show current totals.")}
      </p>
      {loading ? (
        <>
          <AnalyticsSkeleton cards={10} />
          <div className="analytics-chart-grid">
            <AnalyticsSkeleton />
            <AnalyticsSkeleton />
          </div>
        </>
      ) : error ? (
        <AnalyticsError message={error} onRetry={refresh} />
      ) : data ? (
        <>
          <div className="analytics-kpi-grid">
            <SmartKpi
              periodMetric
              title="Gross sales"
              value={money(data.current.grossSales)}
              current={data.current.grossSales}
              previous={data.previous?.grossSales}
              icon={CircleDollarSign}
              helper={t("Eligible completed merchandise subtotal")}
              href="/dashboard/sales"
            />
            <SmartKpi
              periodMetric
              title="Net sales"
              value={money(data.current.netSales)}
              current={data.current.netSales}
              previous={data.previous?.netSales}
              icon={Wallet}
              helper={t("After discounts · before shipping")}
              href="/dashboard/sales"
            />
            <SmartKpi
              periodMetric
              title="Orders"
              value={integer(data.current.orders)}
              current={data.current.orders}
              previous={data.previous?.orders}
              icon={ShoppingBag}
              helper={t("Orders created in this period")}
              href="/dashboard/orders"
            />
            <SmartKpi
              periodMetric
              title="Average order value"
              value={money(data.current.aov)}
              current={data.current.aov}
              previous={data.previous?.aov}
              icon={BarChart3}
              helper={`${integer(data.current.paidOrders)} ${t("eligible completed orders")}`}
              href="/dashboard/sales"
            />
            <SmartKpi
              title="Customers"
              value={integer(data.catalog.customers)}
              current={data.catalog.customers}
              icon={Users}
              helper={t("Registered customers")}
              href="/dashboard/customers"
            />
            <SmartKpi
              title="Products"
              value={integer(data.catalog.products)}
              current={data.catalog.products}
              icon={Package}
              helper={t("Current catalog total")}
              href="/dashboard/products"
            />
            <SmartKpi
              title="Units on hand"
              value={integer(data.catalog.totalUnits)}
              current={data.catalog.totalUnits}
              icon={Boxes}
              helper={t("Tracked active variants")}
              href="/dashboard/inventory"
            />
            <SmartKpi
              title="Low stock"
              value={integer(data.catalog.lowStock)}
              current={data.catalog.lowStock}
              icon={TriangleAlert}
              helper={`${t("1–10 units")} · ${integer(data.catalog.criticalStock)} ${t("critical")}`}
              status={
                data.catalog.criticalStock
                  ? "critical"
                  : data.catalog.lowStock
                    ? "warning"
                    : "normal"
              }
              href="/dashboard/inventory?attention=low"
            />
            <SmartKpi
              title="Out of stock"
              value={integer(data.catalog.outOfStock)}
              current={data.catalog.outOfStock}
              icon={PackageX}
              helper={t("Tracked active variants at zero")}
              status={data.catalog.outOfStock ? "critical" : "normal"}
              href="/dashboard/inventory?attention=out"
            />
            <SmartKpi
              title="Visible brands"
              value={integer(data.catalog.visibleBrands)}
              current={data.catalog.visibleBrands}
              icon={Tags}
              helper={t("Brands currently visible")}
              href="/dashboard/brands"
            />
          </div>
          <AnalyticsCharts snapshot={data} compare={compare} />
        </>
      ) : null}
      <InventoryAlertCenter revision={revision} />
      {data && range && !error && !loading && (
        <>
          <ProductPerformance snapshot={data} compare={compare} />
          <AnalyticsContext snapshot={data} />
        </>
      )}
      <details className="analytics-definitions">
        <summary>{t("How these metrics are calculated")}</summary>
        <p>
          {t(
            "Gross sales use merchandise subtotals. Net sales subtract recorded discounts and exclude shipping. AOV divides net sales by eligible completed orders. Paid and partially refunded sales are included; full refunds are excluded. Partial refunds retain recorded values because refund amounts are not available.",
          )}
        </p>
        <p>
          {t(
            "Orders use creation date; sales use completion date. Comparisons use the same elapsed duration immediately before the selected range. All boundaries use UTC. Catalog totals are current and have no historical comparison.",
          )}
        </p>
      </details>
    </div>
  );
}
