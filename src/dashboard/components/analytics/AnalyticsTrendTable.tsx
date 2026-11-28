import { useState } from "react";
import { ArrowDownToLine, ChevronLeft, ChevronRight, Table2 } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import { downloadCsv } from "@/dashboard/lib/exportCsv";
import { formatAnalyticsDates, type AnalyticsTrendBucket } from "@/dashboard/lib/analytics";
import type { AnalyticsSnapshot } from "@/dashboard/data/analytics";

const PAGE_SIZE = 10;
const sorts = [
  ["date", "Most recent"],
  ["revenue", "Highest net sales"],
  ["orders", "Most orders"],
] as const;

export default function AnalyticsTrendTable({
  snapshot,
  rows,
}: {
  snapshot: AnalyticsSnapshot;
  rows: AnalyticsTrendBucket[];
}) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-LB" : "en-US";
  const dates = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: snapshot.currency });
  const number = new Intl.NumberFormat(locale);
  const [sort, setSort] = useState<(typeof sorts)[number][0]>("date");
  const [page, setPage] = useState(0);
  const compare = snapshot.previous !== null;
  const byDate = (a: AnalyticsTrendBucket, b: AnalyticsTrendBucket) =>
    Date.parse(b.date) - Date.parse(a.date);
  const sorted = [...rows].sort((a, b) =>
    sort === "date" ? byDate(a, b) : b[sort] - a[sort] || byDate(a, b),
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  function exportTimeline() {
    downloadCsv(
      `space-call-analytics-trend-${snapshot.periodStart.slice(0, 10)}-${snapshot.currency}.csv`,
      [
        [
          "Period start (UTC)",
          "Period end exclusive (UTC)",
          "Currency",
          "Net sales",
          "Orders created",
          ...(compare
            ? [
                "Previous start (UTC)",
                "Previous end exclusive (UTC)",
                "Previous net sales",
                "Previous orders",
              ]
            : []),
        ].map(t),
        ...sorted.map((point) => [
          point.date,
          point.end,
          snapshot.currency,
          point.revenue,
          point.orders,
          ...(compare
            ? [
                point.previousDate,
                point.previousEnd ?? "",
                point.previousRevenue ?? "",
                point.previousOrders ?? "",
              ]
            : []),
        ]),
      ],
    );
  }

  return (
    <details className="analytics-panel analytics-timeline">
      <summary>
        <Table2 size={18} aria-hidden="true" />
        <span>{t("Trend data table")}</span>
        <small>
          {number.format(rows.length)} {t("intervals")}
        </small>
      </summary>
      <div className="analytics-table-tools">
        <label>
          {t("Sort trend")}
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as typeof sort);
              setPage(0);
            }}
          >
            {sorts.map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="analytics-button"
          onClick={exportTimeline}
          disabled={!rows.length}
        >
          <ArrowDownToLine size={16} /> {t("Export trend CSV")}
        </button>
      </div>
      {rows.length > 0 ? (
        <>
          <table>
            <caption className="sr-only">
              {t("Trend data table")} · UTC · {snapshot.currency}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("Period")} · UTC</th>
                <th scope="col">{t("Net sales")}</th>
                <th scope="col">{t("Orders")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.date}>
                  <th scope="row">
                    <bdi>{formatAnalyticsDates(row.date, row.end, dates)}</bdi>
                    {compare && row.previousEnd && (
                      <small>
                        {t("Previous period")}{" "}
                        <bdi>{formatAnalyticsDates(row.previousDate, row.previousEnd, dates)}</bdi>
                      </small>
                    )}
                  </th>
                  <td>
                    <bdi>{money.format(row.revenue)}</bdi>
                    {compare && (
                      <small>
                        {t("Previous period")}{" "}
                        <bdi>
                          {row.previousRevenue === null ? "—" : money.format(row.previousRevenue)}
                        </bdi>
                      </small>
                    )}
                  </td>
                  <td>
                    <bdi>{number.format(row.orders)}</bdi>
                    {compare && (
                      <small>
                        {t("Previous period")}{" "}
                        <bdi>
                          {row.previousOrders === null ? "—" : number.format(row.previousOrders)}
                        </bdi>
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="analytics-pagination">
              <span aria-live="polite">
                {t("Page")}{" "}
                <bdi>
                  {number.format(currentPage + 1)} / {number.format(pageCount)}
                </bdi>
              </span>
              <div>
                <button
                  type="button"
                  className="analytics-icon-button"
                  disabled={currentPage === 0}
                  aria-label={t("Previous trend page")}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  className="analytics-icon-button"
                  disabled={currentPage + 1 >= pageCount}
                  aria-label={t("Next trend page")}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="analytics-caption p-4">{t("No trend data for this period.")}</p>
      )}
    </details>
  );
}
