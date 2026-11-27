import { preloadDashboardRoute } from "@/dashboard/config/routes";
import { useLanguage } from "@/dashboard/i18n";
import { LayoutDashboard, Menu, Package, PackagePlus, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";

export default function MobileBottomNav({ onMore, open }: { onMore: () => void; open: boolean }) {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const items = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { label: "Products", href: "/dashboard/products", icon: Package },
    { label: "Add", href: "/dashboard/products/new", icon: PackagePlus },
  ];

  return (
    <nav
      className="dashboard-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/90 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur-lg lg:hidden"
      aria-label="Dashboard mobile navigation"
    >
      <div className="dashboard-mobile-nav-grid grid min-h-[68px] grid-cols-5">
        {items.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? location === href || location === "/dashboard/"
              : href === "/dashboard/products"
                ? location.startsWith(href) && !location.startsWith("/dashboard/products/new")
                : location.startsWith(href);
          return (
            <button
              key={href}
              type="button"
              onTouchStart={() => void preloadDashboardRoute(href)}
              onClick={() => {
                void preloadDashboardRoute(href);
                navigate(href);
              }}
              className={`dashboard-mobile-nav-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${active ? "is-active text-primary" : "text-muted-foreground"} ${href === "/dashboard/products/new" ? "dashboard-mobile-nav-create" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`dashboard-mobile-nav-icon grid size-9 place-items-center rounded-xl ${active ? "bg-accent" : ""}`}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className="max-w-full truncate">{t(label)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-controls="dashboard-sidebar-navigation"
          aria-expanded={open}
          className={`dashboard-mobile-nav-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${open ? "is-active text-primary" : "text-muted-foreground"}`}
        >
          <span className="dashboard-mobile-nav-icon grid size-9 place-items-center rounded-xl">
            <Menu className="size-[18px]" />
          </span>
          <span>{t("More")}</span>
        </button>
      </div>
    </nav>
  );
}
