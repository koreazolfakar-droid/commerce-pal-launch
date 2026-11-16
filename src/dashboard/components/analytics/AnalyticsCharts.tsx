import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/dashboard/i18n";
import type { AnalyticsSnapshot } from "@/dashboard/data/analytics";
import { AnalyticsEmpty, AnalyticsPanel } from "./AnalyticsPrimitives";

type Point = AnalyticsSnapshot["trend"][number];
export default function AnalyticsCharts({
  snapshot,
  compare,
}: {
  snapshot: AnalyticsSnapshot;
  compare: boolean;
}) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const [selected, setSelected] = useState("");
  const date = (value: string, full = false) =>
    new Date(value).toLocaleDateString(locale, {
      month: full ? "long" : "short",
      day: "numeric",
      ...(full ? { year: "numeric" } : {}),
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
      <strong>{date(point.date, true)} · UTC</strong>
      <span>
        {t("Selected period")}
        <b>{revenue ? money(point.revenue) : integer(point.orders)}</b>
      </span>
      {compare && (
        <>
          <small>
            {t("Previous period")} · {date(point.previousDate, true)}
          </small>
          <span>
            {t("Value")}
            <b>
              {revenue ? money(point.previousRevenue ?? 0) : integer(point.previousOrders ?? 0)}
            </b>
          </span>
        </>
      )}
    </div>
  );
  return (
    <div className="analytics-chart-grid">
      {[true, false].map((revenue) => {
        const key = revenue ? "revenue" : "orders";
        const previousKey = revenue ? "previousRevenue" : "previousOrders";
        const hasData = snapshot.trend.some(
          (p) => p[key] !== 0 || (compare && (p[previousKey] ?? 0) !== 0),
        );
        const selectedPoint = snapshot.trend.find((p) => p.date === selected);
        return (
          <AnalyticsPanel
            key={key}
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
                      data={snapshot.trend}
                      accessibilityLayer
                      margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
                      onClick={(state) => {
                        if (state?.activeLabel) setSelected(String(state.activeLabel));
                      }}
                    >
                      <defs>
                        <linearGradient id="analytics-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--analytics-blue)" stopOpacity={0.24} />
                          <stop
                            offset="100%"
                            stopColor="var(--analytics-blue)"
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--analytics-border)"
                        strokeDasharray="3 4"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => date(String(v))}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={35}
                        tick={{ fontSize: 10, fill: "var(--analytics-muted)" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={revenue}
                        tickFormatter={(v) =>
                          Number(v).toLocaleString(locale, { notation: "compact" })
                        }
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
                          fill="url(#analytics-revenue-fill)"
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
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="analytics-chart-inspect">
                  <label>
                    {t("Inspect date")}
                    <select
                      aria-label={`${t("Inspect date")} · ${t(revenue ? "Revenue trend" : "Orders trend")}`}
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="">{t("Choose a date")}</option>
                      {snapshot.trend.map((p) => (
                        <option key={p.date} value={p.date}>
                          {date(p.date, true)}
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
      })}
    </div>
  );
}
