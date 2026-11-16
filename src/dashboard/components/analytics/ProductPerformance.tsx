import { useState } from "react";
import { Link } from "wouter";
import { Eye, Pencil, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import type { AnalyticsSnapshot, PerformanceProduct } from "@/dashboard/data/analytics";
import { inventoryHref } from "@/dashboard/lib/analytics";
import DashboardModal from "@/dashboard/components/DashboardModal";
import { AnalyticsEmpty, AnalyticsPanel, ProductThumbnail, Trend } from "./AnalyticsPrimitives";

export default function ProductPerformance({
  snapshot,
  compare,
}: {
  snapshot: AnalyticsSnapshot;
  compare: boolean;
}) {
  const { t, lang } = useLanguage();
  const [view, setView] = useState<PerformanceProduct | null>(null);
  const locale = lang === "ar" ? "ar" : "en-US";
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: snapshot.currency,
      maximumFractionDigits: 2,
    }).format(n);
  const integer = (n: number) => n.toLocaleString(locale);
  const actions = (product: PerformanceProduct) => (
    <div className="analytics-row-actions">
      <button
        className="analytics-icon-button"
        title={t("View product")}
        aria-label={`${t("View product")} · ${product.title}`}
        onClick={() => setView(product)}
      >
        <Eye className="size-4" />
      </button>
      <Link
        className="analytics-icon-button"
        title={t("Edit product")}
        aria-label={`${t("Edit product")} · ${product.title}`}
        href={`/dashboard/products/${product.productId}`}
      >
        <Pencil className="size-4" />
      </Link>
      <Link
        className="analytics-icon-button"
        title={t("Adjust stock")}
        aria-label={`${t("Adjust stock")} · ${product.title}`}
        href={inventoryHref(product.sku || product.title)}
      >
        <SlidersHorizontal className="size-4" />
      </Link>
    </div>
  );
  const stats = (product: PerformanceProduct) => (
    <dl className="analytics-product-stats">
      <div>
        <dt>{t("Units sold")}</dt>
        <dd>{integer(product.units)}</dd>
      </div>
      <div>
        <dt>{t("Orders")}</dt>
        <dd>{integer(product.orders)}</dd>
      </div>
      <div>
        <dt>{t("Revenue")}</dt>
        <dd>{money(product.revenue)}</dd>
      </div>
      <div>
        <dt>{t("Stock")}</dt>
        <dd>{product.stock === null ? t("Untracked") : integer(product.stock)}</dd>
      </div>
    </dl>
  );
  const sections = [
    { key: "topSelling", title: "Top selling products", subtitle: "Ranked by units sold" },
    {
      key: "lowestPerforming",
      title: "Lowest performing products",
      subtitle: "Active products · includes products with no sales",
    },
    {
      key: "highestRevenue",
      title: "Highest revenue products",
      subtitle: "Ranked by merchandise line revenue",
    },
    {
      key: "restock",
      title: "Products needing restock",
      subtitle: "Products with a tracked variant at 10 units or fewer",
    },
  ] as const;
  return (
    <>
      <div className="analytics-section-heading">
        <div>
          <h2>{t("Product performance")}</h2>
          <p>
            {t("Sales follow the selected period. Stock is current. Trends compare units sold.")}
          </p>
        </div>
        <span className="analytics-caption">{t("Up to 8 products per ranking")}</span>
      </div>
      <div className="analytics-performance-grid">
        {sections.map((section) => (
          <AnalyticsPanel key={section.key} title={section.title} description={section.subtitle}>
            {snapshot.products[section.key].length ? (
              <div className="analytics-performance-list">
                {snapshot.products[section.key].map((product, index) => (
                  <article className="analytics-performance-row" key={product.productId}>
                    <div className="analytics-performance-top">
                      <span className="analytics-rank">{integer(index + 1).padStart(2, "0")}</span>
                      <ProductThumbnail src={product.image} />
                      <div className="analytics-product-name">
                        <button onClick={() => setView(product)}>{product.title}</button>
                        <small dir="auto">{product.sku || "—"}</small>
                      </div>
                      {compare && (
                        <Trend current={product.units} previous={product.previousUnits} />
                      )}
                    </div>
                    <div className="analytics-performance-bottom">
                      {stats(product)}
                      {actions(product)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <AnalyticsEmpty
                title={
                  section.key === "restock"
                    ? "No products need restocking."
                    : "No product performance data."
                }
                description="Try another date range to explore your store performance."
              />
            )}
          </AnalyticsPanel>
        ))}
      </div>
      <p className="analytics-caption">
        {t(
          "Product revenue uses recorded line totals before order-level discounts and shipping. Deleted products are excluded from rankings.",
        )}
      </p>
      {view && (
        <DashboardModal
          title="Product performance"
          subtitle={view.title}
          onClose={() => setView(null)}
        >
          <div className="analytics-page analytics-product-preview">
            <ProductThumbnail src={view.image} />
            <h3>{view.title}</h3>
            <p>
              {t("SKU")}: {view.sku || "—"}
            </p>
            {stats(view)}
            {compare && <Trend current={view.units} previous={view.previousUnits} />}
            <div className="analytics-row-actions">
              <Link className="analytics-button" href={`/dashboard/products/${view.productId}`}>
                {t("Edit product")}
              </Link>
              <Link
                className="analytics-button primary"
                href={inventoryHref(view.sku || view.title)}
              >
                {t("Adjust stock")}
              </Link>
            </div>
          </div>
        </DashboardModal>
      )}
    </>
  );
}
