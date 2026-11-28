import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  Link2,
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
import { toast } from "sonner";
import { useDashboardQueryState } from "@/dashboard/hooks/useDashboardQueryState";
import { PageTitle } from "@/dashboard/components/layout/PageTitle";
import { useLanguage } from "@/dashboard/i18n";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import {
  analyticsRange,
  formatAnalyticsDates,
  type AnalyticsInterval,
  type AnalyticsPeriod,
} from "@/dashboard/lib/analytics";
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

const PERIODS = ["7D", "30D", "90D", "12M", "custom"] as const;
const INTERVALS = ["daily", "sevenDays"] as const;

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-LB" : "en-US";
  const [anchor, setAnchor] = useState(() => new Date());
  const [period, setPeriod] = useDashboardQueryState<AnalyticsPeriod>("period", "30D", PERIODS);
  const [initialDates] = useState(() => ({
    from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }));
  const [from, setFrom] = useDashboardQueryState("from", initialDates.from);
  const [to, setTo] = useDashboardQueryState("to", initialDates.to);
  const [compare, setCompare] = useDashboardQueryState<boolean>("compare", true);
  const [requestedCurrency, setCurrency] = useDashboardQueryState<string>("currency", "USD");
  const currency = /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : "USD";
  const [interval, setInterval] = useDashboardQueryState<AnalyticsInterval>(
    "interval",
    "daily",
    INTERVALS,
  );
  const [knownCurrencies, setKnownCurrencies] = useState(["USD"]);
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
  const refresh = useCallback(() => {
    // A fresh snapshot must include events after the previous report cutoff.
    setAnchor(new Date());
    setRevision((n) => n + 1);
  }, []);
  useDashboardRealtimeRefresh(["store_sales", "store_orders", "store_product_variants"], refresh);
  useEffect(() => {
    if (data) {
      setKnownCurrencies((codes) => Array.from(new Set([...codes, ...data.currencies])));
    }
  }, [data]);
  const reportDates = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const integer = (n: number) => n.toLocaleString(locale);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(
      n,
    );
  async function copyReportLink() {
    const url = new URL(window.location.href);
    url.hash = "";
    if (period === "custom" && range) {
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
    }
    try {
      await navigator.clipboard.writeText(url.href);
      toast.success(t("Report link copied."));
    } catch {
      toast.error(t("Unable to copy report link."));
    }
  }

  const exportReport = () => {
    if (!data || loading || error || !range) return;
    const { current, previous, catalog } = data;
    downloadCsv(`space-call-analytics-${data.periodStart.slice(0, 10)}-${data.currency}.csv`, [
      [
        "Metric",
        "Value",
        "Previous period",
        "Currency",
        "Period start (UTC)",
        "Period end exclusive (UTC)",
        "Previous start (UTC)",
        "Previous end exclusive (UTC)",
      ].map(t),
      ...[
        ["Gross merchandise sales", current.grossSales, previous?.grossSales, data.currency],
        ["Net merchandise sales", current.netSales, previous?.netSales, data.currency],
        ["Orders created", current.orders, previous?.orders, ""],
        ["Eligible completed orders", current.paidOrders, previous?.paidOrders, ""],
        ["Average completed order value", current.aov, previous?.aov, data.currency],
      ].map(([name, value, prior, code]) => [
        t(String(name)),
        value ?? "",
        prior ?? "",
        code ?? "",
        data.periodStart,
        data.periodEnd,
        data.previousStart ?? "",
        data.previousEnd ?? "",
      ]),
      ...[
        ["Customers (current)", catalog.customers],
        ["Products (current)", catalog.products],
        ["Units on hand (current)", catalog.totalUnits],
        ["Low stock (current)", catalog.lowStock],
        ["Critical stock (current)", catalog.criticalStock],
        ["Out of stock (current)", catalog.outOfStock],
        ["Visible brands (current)", catalog.visibleBrands],
      ].map(([label, value]) => [t(String(label)), value, "", "", "", "", "", ""]),
      [
        t("Note"),
        t(
          "Net merchandise uses recorded discounts before shipping. Full refunds are excluded. Partial refunds retain recorded values.",
        ),
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ]);
  };
  return (
    <div className="analytics-page" aria-busy={loading}>
      <header className="analytics-header">
        <PageTitle eyebrow="Store performance" title="Analytics" />
        <div className="analytics-header-actions">
          <button
            type="button"
            className="analytics-icon-button"
            aria-label={t("Copy report link")}
            title={t("Copy report link")}
            onClick={() => void copyReportLink()}
            disabled={!range}
          >
            <Link2 size={17} />
          </button>
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
          {PERIODS.map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={period === value}
              onClick={() => {
                setAnchor(new Date());
                setPeriod(value);
              }}
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
              {Array.from(new Set([currency, ...knownCurrencies, ...(data?.currencies ?? [])])).map(
                (code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ),
              )}
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
            <bdi>{formatAnalyticsDates(range.start, range.end, reportDates)}</bdi> · UTC
          </span>
          {compare && (
            <span>
              {t("Compared with")}{" "}
              <bdi>{formatAnalyticsDates(range.previousStart, range.previousEnd, reportDates)}</bdi>
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
      {data && (
        <nav className="analytics-section-links" aria-label={t("Analytics sections")}>
          <a href="#analytics-trends">{t("Sales and order trends")}</a>
          <a href="#analytics-stock">{t("Stock and catalog totals")}</a>
          <a href="#analytics-products">{t("Product performance")}</a>
        </nav>
      )}
      {loading ? (
        <>
          <p role="status" className="analytics-caption">
            {lang === "ar"
              ? "جارٍ تحميل التقرير للفترة والعملة المحددتين…"
              : "Loading the report for the selected period and currency…"}
          </p>
          <AnalyticsSkeleton cards={4} />
          <div className="analytics-chart-grid">
            <AnalyticsSkeleton />
            <AnalyticsSkeleton />
          </div>
        </>
      ) : error ? (
        <AnalyticsError message={error} onRetry={refresh} />
      ) : data ? (
        <>
          <section className="analytics-section" aria-labelledby="analytics-summary-heading">
            <div className="analytics-section-heading">
              <h2 id="analytics-summary-heading">
                <ChartNoAxesCombined size={18} aria-hidden="true" />
                {t("Sales summary")}
              </h2>
              <span className="analytics-caption">{currency}</span>
            </div>
            <div className="analytics-kpi-grid analytics-sales-grid">
              <SmartKpi
                periodMetric
                featured
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
            </div>
          </section>
          <AnalyticsCharts snapshot={data} interval={interval} onIntervalChange={setInterval} />
        </>
      ) : null}
      <section
        id="analytics-stock"
        className="analytics-section"
        aria-labelledby="analytics-stock-heading"
      >
        <div className="analytics-section-heading">
          <h2 id="analytics-stock-heading">{t("Stock and catalog totals")}</h2>
          <span className="analytics-caption">{t("Current totals across the store")}</span>
        </div>
        {data && (
          <div className="analytics-kpi-grid analytics-catalog-grid">
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
        )}
        <InventoryAlertCenter revision={revision} />
      </section>
      {data && range && !error && !loading && (
        <>
          <section
            className="analytics-section"
            id="analytics-products"
            aria-label={t("Product performance")}
          >
            <ProductPerformance snapshot={data} compare={compare} />
          </section>
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
