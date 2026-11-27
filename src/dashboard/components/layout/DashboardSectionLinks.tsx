import { useEffect } from "react";
import { dashboardListHref } from "@/dashboard/lib/listContext";
import { unavailableDashboardRoutes } from "@/dashboard/config/capabilities";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardIdentity } from "@/dashboard/contexts/DashboardIdentityContext";
import { dashboardNavigationSections, normalizeDashboardPath } from "@/dashboard/config/routes";

const workflows = [
  ["orders", "customers", "sales", "inventory"],
  ["products", "brands", "categories", "collections", "inventory"],
  ["inventory", "purchase-orders", "receiving", "suppliers", "procurement"],
  ["homepage", "homepage/hero", "navigation", "media", "seo", "promotions", "marketing"],
  ["settings", "security", "activity", "users"],
];
const navigation = dashboardNavigationSections.flatMap((section) => section.items);

export default function DashboardSectionLinks() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { role } = useDashboardIdentity();
  const path = normalizeDashboardPath(location).replace(
    /^\/dashboard\/receivings\//,
    "/dashboard/receiving/",
  );
  const current = navigation
    .filter(
      (item) =>
        path === item.href || (item.href !== "/dashboard" && path.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  const section = current?.href.replace("/dashboard/", "").replace(/\/new$/, "");
  const related = section
    ? (workflows.find(
        (group) =>
          group.includes(section) && (section !== "inventory" || group.includes("purchase-orders")),
      ) ?? ["homepage", "settings"])
    : [];
  const links = related
    .map((slug) => navigation.find((item) => item.href === `/dashboard/${slug}`))
    .filter(
      (item) =>
        item &&
        !unavailableDashboardRoutes.has(item.href) &&
        item.href !== current?.href &&
        (item.href !== "/dashboard/users" || role === "admin"),
    );
  const detail = Boolean(current && path !== current.href);
  useEffect(() => {
    document.title = `${t(current?.label ?? "Dashboard")} · Space Call`;
  }, [current?.label, t]);
  if (!current || current.href === "/dashboard") return null;
  return (
    <div className="dashboard-section-links">
      <nav aria-label={t("Breadcrumb")} className="dashboard-breadcrumb">
        <Link href="/dashboard">{t("Dashboard")}</Link>
        <ChevronRight className="dashboard-directional size-3.5" aria-hidden="true" />
        {detail ? (
          <>
            <Link href={dashboardListHref(current.href)}>{t(current.label)}</Link>
            <ChevronRight className="dashboard-directional size-3.5" aria-hidden="true" />
            <span aria-current="page">{t("Details")}</span>
          </>
        ) : (
          <span aria-current="page">{t(current.label)}</span>
        )}
      </nav>
      {detail ? (
        <Link href={dashboardListHref(current.href)} className="dashboard-back-link">
          <ArrowLeft className="dashboard-directional size-3.5" />
          {t("Back to list")}
        </Link>
      ) : (
        <nav aria-label={t("Related sections")} className="dashboard-related-links">
          <span>{t("Related sections")}</span>
          {links.map(
            (item) =>
              item && (
                <Link key={item.href} href={item.href}>
                  {t(item.label)}
                </Link>
              ),
          )}
        </nav>
      )}
    </div>
  );
}
