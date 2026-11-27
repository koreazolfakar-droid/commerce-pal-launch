import { unavailableDashboardRoutes } from "@/dashboard/config/capabilities";
import { useDashboardIdentity } from "@/dashboard/contexts/DashboardIdentityContext";
import { useDashboardDialogFocus } from "@/dashboard/hooks/useDashboardDialogFocus";
import { readPreference, writePreference } from "@/dashboard/lib/preferenceStorage";
import { navSections } from "@/dashboard/config/navigation";
import { useLanguage } from "@/dashboard/i18n";
import { preloadDashboardRoute } from "@/dashboard/config/routes";
import { SITE_URL } from "@/lib/storeConfig";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Megaphone,
  Menu,
  Package,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  SearchCheck,
  Settings2,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Package,
  PackagePlus,
  Layers3,
  Tags,
  Boxes,
  Users,
  PanelsTopLeft,
  Image: ImageIcon,
  Badge: Star,
  Menu,
  BadgePercent: TicketPercent,
  Megaphone,
  TicketPercent,
  SearchCheck,
  ChartNoAxesCombined: BarChart3,
  Mail,
  Star,
  FolderOpen,
  UserCog,
  ScrollText: FileText,
  Settings2,
  LockKeyhole,
};

function Logo() {
  const { t } = useLanguage();
  return (
    <div className="dashboard-brand flex min-w-0 items-center gap-3">
      <img className="dashboard-store-logo shrink-0" src="/logo.svg" alt="" width="48" height="34" />
      <div className="dashboard-sidebar-brand-copy min-w-0">
        <div className="dashboard-brand-name truncate" lang="en" dir="ltr">Space Call</div>
        <div className="dashboard-brand-caption truncate">{t("Store management")}</div>
      </div>
    </div>
  );
}

export default function Sidebar({
  mobileOpen,
  setMobileOpen,
  collapsed,
  onToggleCollapsed,
}: {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t, lang } = useLanguage();
  const [location, navigate] = useLocation();
  const identity = useDashboardIdentity();
  const sidebarRef = useRef<HTMLElement>(null);
  useDashboardDialogFocus(mobileOpen, sidebarRef, () => setMobileOpen(false));
  const [smallSidebar, setSmallSidebar] = useState(false);
  const [closedSections, setClosedSections] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(readPreference("dashboard:closed-sections") ?? "[]");
      if (Array.isArray(saved)) setClosedSections(saved.filter((v) => typeof v === "string"));
    } catch {
      /* ignore malformed preference */
    }
  }, []);
  const toggleSection = (label: string) =>
    setClosedSections((current) => {
      const next = current.includes(label)
        ? current.filter((v) => v !== label)
        : [...current, label];
      writePreference("dashboard:closed-sections", JSON.stringify(next));
      return next;
    });
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setSmallSidebar(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [setMobileOpen]);
  const items = navSections.flatMap((section) => section.items);
  const activeHref = location.startsWith("/dashboard/receivings/")
    ? "/dashboard/receiving"
    : items
        .filter(
          (item) =>
            location === item.href ||
            (item.href !== "/dashboard" && location.startsWith(item.href + "/")),
        )
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (href: string) => href === activeHref;

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <button
          aria-label={t("Close menu")}
          onClick={() => setMobileOpen(false)}
          className="dashboard-navigation-backdrop fixed inset-0 z-40 touch-none bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <aside
        ref={sidebarRef}
        id="dashboard-sidebar-navigation"
        inert={smallSidebar && !mobileOpen ? true : undefined}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={t("Navigation")}
        tabIndex={-1}
        className={`dashboard-sidebar sidebar-polished fixed inset-y-0 start-0 z-50 flex w-[min(90vw,336px)] flex-col overscroll-contain pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white transition-transform duration-200 ${mobileOpen ? "max-md:translate-x-0" : lang === "ar" ? "max-md:translate-x-full" : "max-md:-translate-x-full"}`}
      >
        <div className="dashboard-sidebar-brand flex min-h-[88px] items-center justify-between gap-3 px-5">
          <Logo />
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={t(collapsed ? "Expand navigation" : "Collapse navigation")}
            title={t(collapsed ? "Expand navigation" : "Collapse navigation")}
            aria-expanded={!collapsed}
            className="dashboard-sidebar-collapse grid size-10 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("Close navigation")}
            className="dashboard-sidebar-close grid size-10 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label={t("Workspace navigation")} className="dashboard-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-none lg:py-5">
          {navSections.map((section) => (
            <section key={section.label} className="dashboard-sidebar-group mb-5"
              data-active-section={section.items.some((item) => isActive(item.href)) ? "true" : undefined}>
              <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  aria-expanded={!closedSections.includes(section.label)}
                  className="dashboard-sidebar-section dashboard-sidebar-group-heading mb-2 flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-white"
                >
                  <span>{t(section.label)}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-3.5 transition-transform duration-150 ${closedSections.includes(section.label) ? "-rotate-90" : ""}`}
                  />
                </button>
              <div className="dashboard-sidebar-items">
                {section.items
                  .filter((item) => !unavailableDashboardRoutes.has(item.href))
                  .filter((item) => collapsed || !closedSections.includes(section.label) || item.href === activeHref)
                  .filter((item) => item.href !== "/dashboard/users" || identity.role === "admin")
                  .map((item) => {
                    const Icon = iconMap[item.icon] ?? LayoutDashboard;
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        aria-label={t(item.label)}
                        title={t(item.label)}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={() => void preloadDashboardRoute(item.href)}
                        onFocus={() => void preloadDashboardRoute(item.href)}
                        onTouchStart={() => void preloadDashboardRoute(item.href)}
                        onClick={() => {
                          void preloadDashboardRoute(item.href);
                          navigate(item.href);
                          setMobileOpen(false);
                        }}
                        className="dashboard-sidebar-action group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[13px] font-medium transition-colors duration-150"
                      >
                        <Icon
                          className="dashboard-sidebar-item-icon size-[18px] shrink-0"
                          strokeWidth={1.8}
                        />
                        <>
                          <span className="dashboard-sidebar-label min-w-0 flex-1 truncate">{t(item.label)}</span>
                            {[
                              "/dashboard/marketing",
                              "/dashboard/coupons",
                              "/dashboard/messages",
                              "/dashboard/reviews",
                            ].includes(item.href) ? (
                              <span className="dashboard-sidebar-status dashboard-sidebar-label ms-auto rounded px-1.5 py-0.5 text-[10px]">
                                {t("Not connected")}
                              </span>
                            ) : null}
                        </>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </nav>
        <div className="dashboard-sidebar-footer p-3">
          <div className="dashboard-sidebar-shortcuts mb-3">
              <button
                type="button"
                onClick={() => {
                  void preloadDashboardRoute("/dashboard/products/new");
                  navigate("/dashboard/products/new");
                  setMobileOpen(false);
                }}
                aria-label={t("Quick product")}
                title={t("Quick product")}
                className="dashboard-sidebar-new-product flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold"
              >
                <PackagePlus className="size-[18px]" strokeWidth={1.8} />
                <span className="dashboard-sidebar-label flex-1 text-start">{t("Quick product")}</span>
                <span className="dashboard-sidebar-label" aria-hidden="true">+</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(SITE_URL, "_blank", "noopener,noreferrer")}
                aria-label={t("Open store")}
                title={t("Open store")}
                className="dashboard-sidebar-store flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium"
              >
                <ExternalLink className="size-4" />
                <span className="dashboard-sidebar-label flex-1 text-start">{t("Open store")}</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
}
