import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DASHBOARD_NAV_GROUPS, DASHBOARD_SEARCH_TARGETS } from "@/dashboard/config/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { cn } from "@/lib/utils";

type SidebarBadgeKey = "orders" | "products" | "inventory";
type SidebarCounts = Record<SidebarBadgeKey, number>;
type DashboardNavItem = (typeof DASHBOARD_SEARCH_TARGETS)[number];

async function getSidebarCounts(): Promise<SidebarCounts> {
  const [ordersResult, productsResult, inventoryResult] = await Promise.all([
    supabase
      .from("store_orders" as never)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("store_products" as never)
      .select("id", { count: "exact", head: true })
      .neq("status", "archived"),
    supabase
      .from("store_product_variants" as never)
      .select("stock_quantity,track_inventory,is_active")
      .eq("is_active", true),
  ]);

  const inventoryRows = (inventoryResult.data ?? []) as Array<{
    stock_quantity: number;
    track_inventory: boolean;
    is_active: boolean;
  }>;

  const needsAttention = inventoryRows.filter(
    (row) => row.track_inventory && row.stock_quantity <= 5,
  ).length;

  return {
    orders: ordersResult.error ? 0 : (ordersResult.count ?? 0),
    products: productsResult.error ? 0 : (productsResult.count ?? 0),
    inventory: inventoryResult.error ? 0 : needsAttention,
  };
}

type DashboardSidebarProps = {
  collapsed: boolean;
  mobile?: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
  onSignOut: () => void;
};

function SpaceCallBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/8 p-1.5 ring-1 ring-white/10">
        <img src="/logo.svg" alt="Space Call" className="size-full object-contain" />
      </span>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black tracking-tight text-white">Space Call</p>
          <p className="mt-0.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Commerce OS
          </p>
        </div>
      ) : null}
    </div>
  );
}

function NavItem({
  item,
  collapsed,
  badge,
  onNavigate,
}: {
  item: DashboardNavItem;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const { language } = useDashboardLanguage();
  const Icon = item.icon;
  const label = language === "ar" ? item.ar : item.en;

  const link = (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/dashboard" }}
      activeProps={{
        className:
          "bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,.95)] hover:bg-white hover:text-slate-950",
      }}
      onClick={onNavigate}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold text-slate-300 transition-colors duration-150 hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[16px] shrink-0" strokeWidth={1.8} />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {!collapsed && badge !== undefined && badge > 0 ? (
        <span className="grid min-w-6 place-items-center rounded-full bg-slate-700 px-1.5 py-1 text-[9px] font-black text-white group-data-[status=active]:bg-slate-900">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="bg-[#0b1428] text-white">
        {label}
        {badge !== undefined && badge > 0 ? ` · ${badge}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function DashboardSidebar({
  collapsed,
  mobile,
  onToggleCollapsed,
  onClose,
  onSignOut,
}: DashboardSidebarProps) {
  const { language, text } = useDashboardLanguage();
  const { data: counts = { orders: 0, products: 0, inventory: 0 } } = useQuery({
    queryKey: ["dashboard", "sidebar-counts"],
    queryFn: getSidebarCounts,
    staleTime: 30_000,
  });

  const compact = collapsed && !mobile;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col bg-[#0b1428] text-white">
        <div
          className={cn(
            "flex h-[72px] items-center border-b border-white/8 px-4",
            compact ? "justify-center" : "justify-between",
          )}
        >
          <SpaceCallBrand collapsed={compact} />
          {mobile ? (
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/8 hover:text-white"
              aria-label={text("إغلاق القائمة", "Close menu")}
            >
              <X className="size-5" />
            </button>
          ) : !compact ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
              aria-label={text("تصغير القائمة", "Collapse sidebar")}
            >
              <PanelLeftClose className="size-4" />
            </button>
          ) : null}
        </div>

        {compact ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="mx-auto mt-3 grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
            aria-label={text("توسيع القائمة", "Expand sidebar")}
          >
            <PanelLeftOpen className="size-4" />
          </button>
        ) : null}

        <div className={cn("flex-1 overflow-y-auto py-3", compact ? "px-2.5" : "px-3")}>
          <nav className="space-y-4" aria-label={text("تنقل لوحة التحكم", "Dashboard navigation")}>
            {DASHBOARD_NAV_GROUPS.map((group, groupIndex) => (
              <section key={group.id}>
                {groupIndex > 0 && compact ? <div className="my-2 border-t border-white/8" /> : null}
                {!compact ? (
                  <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
                    {language === "ar" ? group.ar : group.en}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const badgeKey = item.badge as SidebarBadgeKey | undefined;
                    return (
                      <NavItem
                        key={item.to}
                        item={item}
                        collapsed={compact}
                        badge={badgeKey ? counts[badgeKey] : undefined}
                        onNavigate={onClose}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </div>

        <div className={cn("border-t border-white/8 p-3", compact && "px-2.5")}>
          {!compact ? (
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="mb-2 flex h-10 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <span>{text("فتح المتجر", "Open storefront")}</span>
              <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
          <div className="space-y-1">
            {!compact ? (
              <a
                href="mailto:support@spacecallapp.store"
                className="flex h-9 items-center gap-3 rounded-xl px-3 text-[11px] font-semibold text-slate-400 transition hover:bg-white/7 hover:text-white"
              >
                <HelpCircle className="size-4" />
                {text("المساعدة والدعم", "Help & Support")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={onSignOut}
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[11px] font-semibold text-slate-400 transition hover:bg-white/7 hover:text-white",
                compact && "justify-center px-0",
              )}
              aria-label={text("تسجيل الخروج", "Logout")}
              title={compact ? text("تسجيل الخروج", "Logout") : undefined}
            >
              <LogOut className="size-4" />
              {!compact ? text("تسجيل الخروج", "Logout") : null}
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
