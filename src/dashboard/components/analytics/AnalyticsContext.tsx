import { Link } from "wouter";
import { useLanguage } from "@/dashboard/i18n";
import type { AnalyticsSnapshot } from "@/dashboard/data/analytics";
import { AnalyticsEmpty, AnalyticsPanel } from "./AnalyticsPrimitives";

/** Preserve the original Analytics page's recent-order and brand drill-down context. */
export default function AnalyticsContext({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar" : "en-US";
  const money = (n: number, currency = snapshot.currency) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(
      n,
    );
  return (
    <div className="analytics-chart-grid">
      <AnalyticsPanel title="Recent orders" description="Latest across all dates and currencies">
        {snapshot.recentOrders.length ? (
          <div className="analytics-recent-orders">
            {snapshot.recentOrders.map((order) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <div>
                  <strong>
                    #{order.orderNumber} · {order.customer}
                  </strong>
                  <small>
                    {new Date(order.createdAt).toLocaleString(locale)} · {t(order.status)} ·{" "}
                    {t(order.paymentStatus)}
                  </small>
                </div>
                <b>{money(order.total, order.currency)}</b>
              </Link>
            ))}
          </div>
        ) : (
          <AnalyticsEmpty
            title="No orders exist yet. New orders will appear here."
            description="Latest real orders"
          />
        )}
      </AnalyticsPanel>
      <AnalyticsPanel
        title="Top brands"
        description="Share of branded product revenue in this period"
      >
        {snapshot.topBrands.length ? (
          <div className="analytics-brand-list">
            {snapshot.topBrands.map((brand) => (
              <div key={brand.brandId}>
                <div>
                  <Link href="/dashboard/brands">{brand.name}</Link>
                  <span>
                    {money(brand.revenue)} ·{" "}
                    {(brand.share ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 })}%
                  </span>
                </div>
                <progress value={brand.share ?? 0} max={100} aria-label={brand.name} />
              </div>
            ))}
          </div>
        ) : (
          <AnalyticsEmpty
            title="No brand sales data yet."
            description="Try another date range to explore your store performance."
          />
        )}
      </AnalyticsPanel>
    </div>
  );
}
