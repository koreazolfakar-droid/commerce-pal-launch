import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import { loadInventoryAlerts, type AlertSort, type AlertStatus } from "@/dashboard/data/analytics";
import { useAnalyticsResource } from "@/dashboard/hooks/useAnalyticsResource";
import { inventoryHref } from "@/dashboard/lib/analytics";
import {
  AnalyticsEmpty,
  AnalyticsError,
  AnalyticsPanel,
  AnalyticsSkeleton,
  ProductThumbnail,
} from "./AnalyticsPrimitives";

export default function InventoryAlertCenter({ revision }: { revision: number }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<AlertStatus>("all");
  const [sort, setSort] = useState<AlertSort>("severity");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    (signal: AbortSignal) => loadInventoryAlerts({ search: debounced, status, sort, page }, signal),
    [debounced, status, sort, page],
  );
  const key = JSON.stringify([debounced, status, sort, page, revision, retry]);
  const resource = useAnalyticsResource(key, load);
  const { data, loading, error } = resource;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 8));
  useEffect(() => {
    if (data && page > pages) setPage(pages);
  }, [data, page, pages]);
  const label = { out: "Out of stock", critical: "Critical stock", low: "Low stock" };
  const count = (n: number) => n.toLocaleString(lang === "ar" ? "ar" : "en-US");
  const pending = search.trim() !== debounced;
  return (
    <AnalyticsPanel
      title="Inventory alert center"
      description="Current tracked variants · low ≤10, critical ≤3, out ≤0"
      action={
        <Link className="analytics-text-link" href="/dashboard/inventory">
          {t("Manage inventory")}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Link>
      }
    >
      <div className="analytics-alert-filters">
        <label className="analytics-search">
          <Search className="size-4" aria-hidden="true" />
          <span className="sr-only">{t("Search stock alerts")}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search product, SKU or variant")}
            maxLength={120}
          />
        </label>
        <label>
          <span className="sr-only">{t("Stock status")}</span>
          <select
            aria-label={t("Stock status")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AlertStatus);
              setPage(1);
            }}
          >
            <option value="all">{t("All alerts")}</option>
            <option value="out">{t("Out of stock")}</option>
            <option value="critical">{t("Critical stock")}</option>
            <option value="low">{t("Low stock")}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{t("Sort stock alerts")}</span>
          <select
            aria-label={t("Sort stock alerts")}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as AlertSort);
              setPage(1);
            }}
          >
            <option value="severity">{t("Priority first")}</option>
            <option value="stock-asc">{t("Stock: low to high")}</option>
            <option value="stock-desc">{t("Stock: high to low")}</option>
            <option value="name">{t("Product name")}</option>
          </select>
        </label>
      </div>
      {loading || pending ? (
        <AnalyticsSkeleton />
      ) : error ? (
        <AnalyticsError message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : data?.items.length ? (
        <>
          <div className="analytics-alert-list">
            {data.items.map((item) => (
              <article key={item.variantId} className="analytics-alert-row">
                <ProductThumbnail src={item.image} />
                <div className="analytics-alert-product">
                  <Link href={`/dashboard/products/${item.productId}`}>{item.title}</Link>
                  <p>{item.variant || t("Default variant")}</p>
                  <small dir="auto">
                    {t("SKU")}: {item.sku || "—"}
                  </small>
                </div>
                <div className="analytics-alert-stock">
                  <strong>
                    {count(item.stock)} <small>{t("on hand")}</small>
                  </strong>
                  <small>
                    {t("Threshold")}: {count(item.threshold)}
                  </small>
                </div>
                <span className={`analytics-status ${item.status}`}>{t(label[item.status])}</span>
                <div className="analytics-row-actions">
                  <Link
                    className="analytics-button"
                    href={inventoryHref(item.sku || item.title)}
                    aria-label={`${t("Adjust stock")} · ${item.title} · ${item.variant || ""}`}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    {t("Adjust stock")}
                  </Link>
                  <Link
                    className="analytics-text-link"
                    href={`/dashboard/products/${item.productId}`}
                    aria-label={`${t("View product")} · ${item.title}`}
                  >
                    {t("View product")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="analytics-pagination">
            <span role="status">
              {count(data.total)} {t("stock alerts")} · {count(page)} / {count(pages)}
            </span>
            <div>
              <button
                className="analytics-button"
                aria-label={t("Previous page")}
                disabled={page === 1}
                onClick={() => setPage((n) => n - 1)}
              >
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </button>
              <button
                className="analytics-button"
                aria-label={t("Next page")}
                disabled={page >= pages}
                onClick={() => setPage((n) => n + 1)}
              >
                <ChevronRight className="size-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <AnalyticsEmpty
          title={
            search || status !== "all"
              ? "No matching stock alerts."
              : "Your inventory is in good shape."
          }
          description={
            search || status !== "all"
              ? "Try another search or stock status."
              : "No tracked variants need attention right now."
          }
        />
      )}
    </AnalyticsPanel>
  );
}
