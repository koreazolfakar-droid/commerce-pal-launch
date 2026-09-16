import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  X,
} from "lucide-react";

import {
  DASHBOARD_CONTENT_NAVIGATION,
  DASHBOARD_NAVIGATION,
} from "@/dashboard/config/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { cn } from "@/lib/utils";

async function getPendingOrdersCount() {
  const result = await supabase
    .from("store_orders" as never)
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return result.error ? 0 : (result.count ?? 0);
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
          <p className="mt-0.5 whitespace-nowrap text-[9px] font-medium text-slate-400">
            Tech for a Better Tomorrow
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarPromoCard({ language }: { language: "ar" | "en" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(79,70,229,.42),rgba(124,58,237,.16)_55%,rgba(255,255,255,.04))] p-4">
      <div className="pointer-events-none absolute -end-6 bottom-0 opacity-85">
        <Smartphone className="size-24 rotate-[8deg] text-blue-300/80" strokeWidth={1.1} />
      </div>
      <div className="relative max-w-[118px]">
        <p className="text-[14px] font-black leading-[1.35] text-white">
          {language === "ar" ? "تقنية أذكى، غدٌ أكثر إشراقاً" : "Smarter Tech, Brighter Tomorrows"}
        </p>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 text-[10px] font-bold text-blue-100 transition hover:bg-blue-500/20"
        >
          {language === "ar" ? "عرض المتجر" : "View Store"} <ArrowUpRight className="size-3" />
        </a>
      </div>
    </div>
  );
}

function NavItem({
  item,
  collapsed,
  badge,
  onNavigate,
}: {
  item: (typeof DASHBOARD_NAVIGATION)[number] | (typeof DASHBOARD_CONTENT_NAVIGATION)[number];
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
          "bg-[linear-gradient(100deg,#3b82f6,#5b5cf0_55%,#7c3aed)] text-white shadow-[0_8px_22px_-16px_rgba(79,70,229,.9)] hover:text-white",
      }}
      onClick={onNavigate}
      className={cn(
        "group flex h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold text-slate-300 transition-colors duration-150 hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[17px] shrink-0" strokeWidth={1.8} />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {!collapsed && badge && badge > 0 ? (
        <span className="grid min-w-6 place-items-center rounded-full bg-white/12 px-1.5 py-1 text-[9px] font-black text-white">
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
  const { data: pendingOrders = 0 } = useQuery({
    queryKey: ["dashboard", "pending-orders-count"],
    queryFn: getPendingOrdersCount,
    staleTime: 30_000,
  });

  const compact = collapsed && !mobile;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col bg-[#0b1428] text-white">
        <div className={cn("flex h-[72px] items-center border-b border-white/8 px-4", compact ? "justify-center" : "justify-between")}>
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

        <div className={cn("flex-1 overflow-y-auto py-4", compact ? "px-2.5" : "px-3")}>
          <nav className="space-y-1" aria-label={text("تنقل لوحة التحكم", "Dashboard navigation")}>
            {DASHBOARD_NAVIGATION.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                collapsed={compact}
                badge={item.badge === "orders" ? pendingOrders : undefined}
                onNavigate={onClose}
              />
            ))}
          </nav>

          <div className="my-4 border-t border-white/8" />
          {!compact ? (
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">
              {language === "ar" ? "المحتوى" : "Content"}
            </p>
          ) : null}
          <nav className="space-y-1" aria-label={text("إدارة المحتوى", "Content management")}>
            {DASHBOARD_CONTENT_NAVIGATION.map((item) => (
              <NavItem key={item.to} item={item} collapsed={compact} onNavigate={onClose} />
            ))}
          </nav>
        </div>

        <div className={cn("border-t border-white/8 p-3", compact && "px-2.5")}>
          {!compact ? <SidebarPromoCard language={language} /> : null}
          <div className={cn("mt-3 space-y-1", compact && "mt-0")}>
            {!compact ? (
              <a
                href="mailto:support@spacecallapp.store"
                className="flex h-10 items-center gap-3 rounded-xl px-3 text-[11px] font-semibold text-slate-400 transition hover:bg-white/7 hover:text-white"
              >
                <HelpCircle className="size-4" />
                {text("المساعدة والدعم", "Help & Support")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={onSignOut}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[11px] font-semibold text-slate-400 transition hover:bg-white/7 hover:text-white",
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
