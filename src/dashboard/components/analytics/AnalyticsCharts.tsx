import { useId, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/dashboard/i18n";
import type { AnalyticsSnapshot } from "@/dashboard/data/analytics";
import {
  analyticsTrendBuckets,
  formatAnalyticsDates,
  type AnalyticsInterval,
  type AnalyticsTrendBucket,
} from "@/dashboard/lib/analytics";
import AnalyticsTrendTable from "./AnalyticsTrendTable";
import { AnalyticsEmpty, AnalyticsPanel } from "./AnalyticsPrimitives";

type Point = AnalyticsTrendBucket;

function TrendChart({
  snapshot,
  points,
  revenue,
}: {
  snapshot: AnalyticsSnapshot;
  points: Point[];
  revenue: boolean;
}) {
  const compare = snapshot.previous !== null;
  const fillId = useId();
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-LB" : "en-US";
  const dates = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const [selected, setSelected] = useState("");
  const axisDate = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: snapshot.currency,
      maximumFractionDigits: 2,
    }).format(value);
  const integer = (value: number) => value.toLocaleString(locale);
  const detail = (point: Point, revenue: boolean) => (
    <div className="analytics-chart-tooltip">
      <strong>
        <bdi>{formatAnalyticsDates(point.date, point.end, dates)}</bdi> · UTC
      </strong>
      <span>
        {t("Selected period")}
        <b>{revenue ? money(point.revenue) : integer(point.orders)}</b>
      </span>
      {compare && point.previousEnd && (
        <>
          <small>
            {t("Previous period")} ·{" "}
            <bdi>{formatAnalyticsDates(point.previousDate, point.previousEnd, dates)}</bdi>
          </small>
          <span>
            {t("Value")}
            <b>
              {revenue
                ? point.previousRevenue === null
                  ? "—"
                  : money(point.previousRevenue)
                : point.previousOrders === null
                  ? "—"
                  : integer(point.previousOrders)}
            </b>
          </span>
        </>
      )}
    </div>
  );
  const key = revenue ? "revenue" : "orders";
  const previousKey = revenue ? "previousRevenue" : "previousOrders";
  const hasData = points.some(
    (point) => point[key] !== 0 || (compare && (point[previousKey] ?? 0) !== 0),
  );
  const selectedPoint = points.find((point) => point.date === selected);
  return (
    <AnalyticsPanel
      title={revenue ? "Revenue trend" : "Orders trend"}
      description={
        revenue ? "Net merchandise sales · shipping excluded" : "Orders by creation date"
      }
      action={
        <span className="analytics-chart-total">
          {revenue ? money(snapshot.current.netSales) : integer(snapshot.current.orders)}
        </span>
      }
    >
      <div className="analytics-chart-legend">
        <span>
          <i />
          {t("Selected period")}
        </span>
        {compare && (
          <span>
            <i className="previous" />
            {t("Previous period")}
          </span>
        )}
      </div>
      {hasData ? (
        <>
          <div
            className="analytics-chart"
            dir="ltr"
            role="img"
            aria-label={t(revenue ? "Revenue trend" : "Orders trend")}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={points}
                accessibilityLayer
                margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
                // Recharts sends both mouse release and a finished tap through this handler.
                onMouseUp={(state) => {
                  if (state?.activeLabel) setSelected(String(state.activeLabel));
                }}
              >
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--analytics-blue)" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="var(--analytics-blue)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--analytics-border)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => axisDate.format(new Date(String(value)))}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={35}
                  tick={{ fontSize: 10, fill: "var(--analytics-muted)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={revenue}
                  tickFormatter={(v) => Number(v).toLocaleString(locale, { notation: "compact" })}
                  tick={{ fontSize: 10, fill: "var(--analytics-muted)" }}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0]?.payload
                      ? detail(payload[0].payload as Point, revenue)
                      : null
                  }
                  cursor={{ stroke: "var(--analytics-muted)", strokeDasharray: "3 3" }}
                  wrapperStyle={{ maxWidth: "min(300px, 80vw)", zIndex: 10 }}
                />
                {revenue ? (
                  <Area
                    type="monotone"
                    name={t("Net sales")}
                    dataKey={key}
                    stroke="var(--analytics-blue)"
                    fill={`url(#${fillId})`}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                ) : (
                  <Bar
                    name={t("Orders")}
                    dataKey={key}
                    fill="var(--analytics-blue)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                )}
                {compare && (
                  <Line
                    type="monotone"
                    name={t("Previous period")}
                    dataKey={previousKey}
                    stroke="var(--analytics-comparison)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {selectedPoint && (
                  <ReferenceLine
                    x={selectedPoint.date}
                    stroke="var(--analytics-muted)"
                    strokeDasharray="3 4"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-chart-inspect">
            <label>
              {t("Inspect date")}
              <select
                aria-label={`${t("Inspect date")} · ${t(revenue ? "Revenue trend" : "Orders trend")}`}
                value={selectedPoint?.date ?? ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">{t("Choose a date")}</option>
                {points.map((p) => (
                  <option key={p.date} value={p.date}>
                    {formatAnalyticsDates(p.date, p.end, dates)}
                  </option>
                ))}
              </select>
            </label>
            {selectedPoint && <div aria-live="polite">{detail(selectedPoint, revenue)}</div>}
          </div>
        </>
      ) : (
        <AnalyticsEmpty
          title={revenue ? "No sales in this period." : "No orders in this period."}
          description="Try another date range to explore your store performance."
        />
      )}
    </AnalyticsPanel>
  );
}

export default function AnalyticsCharts({
  snapshot,
  interval,
  onIntervalChange,
}: {
  snapshot: AnalyticsSnapshot;
  interval: AnalyticsInterval;
  onIntervalChange: (interval: AnalyticsInterval) => void;
}) {
  const { t } = useLanguage();
  const points = useMemo(() => analyticsTrendBuckets(snapshot, interval), [snapshot, interval]);
  return (
    <section
      className="analytics-section"
      id="analytics-trends"
      aria-labelledby="analytics-trends-heading"
    >
      <div className="analytics-section-heading">
        <h2 id="analytics-trends-heading">{t("Sales and order trends")}</h2>
        <div className="analytics-segments" role="group" aria-label={t("Trend interval")}>
          {(
            [
              ["daily", "Daily"],
              ["sevenDays", "7-day groups"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={interval === value}
              onClick={() => onIntervalChange(value)}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>
      <div className="analytics-chart-grid analytics-trend-grid">
        <TrendChart key={`revenue-${interval}`} snapshot={snapshot} revenue points={points} />
        <TrendChart
          key={`orders-${interval}`}
          snapshot={snapshot}
          revenue={false}
          points={points}
        />
      </div>
      <AnalyticsTrendTable snapshot={snapshot} rows={points} />
    </section>
  );
}
