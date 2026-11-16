import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Inbox,
  Minus,
  Package,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/dashboard/i18n";
import { percentageChange } from "@/dashboard/lib/analytics";
import type { ReactNode } from "react";

export function Trend({
  current,
  previous,
  baseline = "Current total",
}: {
  current: number;
  previous: number | null | undefined;
  baseline?: string;
}) {
  const { t, lang } = useLanguage();
  const change = percentageChange(current, previous);
  if (previous == null) return <span className="analytics-trend neutral">{t(baseline)}</span>;
  if (change === null)
    return <span className="analytics-trend neutral">{t("No previous baseline")}</span>;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <span
      title={t("Change vs previous period")}
      className={`analytics-trend ${change > 0 ? "positive" : change < 0 ? "negative" : "neutral"}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {Math.abs(change).toLocaleString(lang === "ar" ? "ar" : "en-US", {
        maximumFractionDigits: 1,
      })}
      %{" "}
      <span className="sr-only">
        {t(change > 0 ? "Increase" : change < 0 ? "Decrease" : "No change")}
      </span>
    </span>
  );
}
export function SmartKpi({
  title,
  value,
  helper,
  icon: Icon,
  href,
  current,
  previous,
  status = "normal",
  periodMetric = false,
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  href?: string;
  current: number;
  previous?: number | null;
  status?: "normal" | "warning" | "critical";
  periodMetric?: boolean;
}) {
  const { t } = useLanguage();
  const body = (
    <>
      <div className="analytics-kpi-heading">
        <span>{t(title)}</span>
        <span className="analytics-kpi-icon">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div className="analytics-kpi-value" dir="auto">
        {value}
      </div>
      <div className="analytics-kpi-footer">
        <Trend
          current={current}
          previous={previous}
          baseline={periodMetric ? "Comparison off" : "Current total"}
        />
        {href && <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />}
      </div>
      <p>{helper}</p>
    </>
  );
  return href ? (
    <Link
      href={href}
      className={`analytics-kpi analytics-panel ${status}`}
      aria-label={`${t(title)}: ${value}`}
    >
      {body}
    </Link>
  ) : (
    <div className={`analytics-kpi analytics-panel ${status}`}>{body}</div>
  );
}
export function AnalyticsPanel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <h2>{t(title)}</h2>
          {description && <p>{t(description)}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function AnalyticsEmpty({ title, description }: { title: string; description: string }) {
  const { t } = useLanguage();
  return (
    <div className="analytics-empty">
      <span>
        <Inbox className="size-6" aria-hidden="true" />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
    </div>
  );
}
export function AnalyticsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="analytics-error" role="alert">
      <strong>{t("Unable to load analytics.")}</strong>
      <p>{t(message)}</p>
      <button type="button" className="analytics-button" onClick={onRetry}>
        <RefreshCw className="size-4" />
        {t("Retry")}
      </button>
    </div>
  );
}
export function AnalyticsSkeleton({ cards = 0 }: { cards?: number }) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-label={t("Loading analytics…")}
      aria-busy="true"
      className={cards ? "analytics-kpi-grid" : "analytics-skeleton-list"}
    >
      {Array.from({ length: cards || 4 }, (_, i) => (
        <div key={i} className="analytics-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function ProductThumbnail({ src }: { src: string }) {
  return (
    <span className="analytics-thumbnail">
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      ) : null}
      <Package className="size-5" aria-hidden="true" />
    </span>
  );
}
