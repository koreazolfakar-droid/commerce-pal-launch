import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ExternalLink,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  Search,
  Settings,
  Store,
  Tags,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardRole } from "@/lib/cmsAdmin.server";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/hero", label: "Hero", icon: Image },
  { href: "/dashboard/sections", label: "أقسام الصفحة", icon: PanelsTopLeft },
  { href: "/dashboard/navigation", label: "القوائم والتنقل", icon: Menu },
  { href: "/dashboard/brands", label: "البراندات", icon: Tags },
  { href: "/dashboard/seo", label: "SEO", icon: Search },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
] as const;

export function DashboardShell({
  children,
  email,
  role,
}: {
  children: ReactNode;
  email: string | null;
  role: DashboardRole;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950" dir="ltr">
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="relative border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col lg:sticky lg:top-0 lg:max-h-screen">
            <a
              href="/dashboard"
              className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 shadow-sm">
                <img src="/logo.svg" alt="Space Call" width={28} height={28} className="size-7" />
              </span>
              <span className="min-w-0" dir="ltr">
                <span className="block truncate text-[15px] font-black tracking-tight">Space Call</span>
                <span className="block truncate text-[11px] font-medium text-slate-400">
                  Commerce Admin
                </span>
              </span>
            </a>

            <div className="overflow-x-auto px-3 py-3 lg:flex-1 lg:overflow-y-auto lg:px-4 lg:py-5">
              <p
                className="mb-2 hidden px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400 lg:block"
                dir="rtl"
              >
                إدارة المتجر
              </p>
              <nav className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col" dir="rtl">
                {items.map((item) => {
                  const exact = "exact" in item && item.exact;
                  const active = exact ? pathname === item.href : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                        active
                          ? "bg-[#315efb] text-white shadow-[0_8px_20px_-12px_rgba(49,94,251,0.9)]"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[17px] shrink-0",
                          active ? "text-white" : "text-slate-400 group-hover:text-slate-700",
                        )}
                      />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="mt-6 hidden border-t border-slate-100 pt-5 lg:block" dir="rtl">
                <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  المتجر
                </p>
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  <Store className="size-[17px] text-slate-400" />
                  فتح Space Call
                  <ExternalLink className="me-auto size-3.5 text-slate-300" />
                </a>
              </div>
            </div>

            <div className="hidden border-t border-slate-100 p-4 lg:block" dir="rtl">
              <div className="rounded-2xl bg-slate-50 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                    <UserRound className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800">
                      {email ?? "حساب الإدارة"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      {role === "admin" ? "Administrator" : "Editor"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 w-full justify-start rounded-lg text-xs text-slate-500 hover:bg-white hover:text-slate-900"
                  onClick={() => void signOut()}
                >
                  <LogOut className="me-2 size-3.5" /> تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-[76px] items-center border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="min-w-0" dir="rtl">
              <p className="text-xs font-bold text-slate-400">Space Call</p>
              <p className="truncate text-sm font-black text-slate-800">لوحة إدارة المتجر</p>
            </div>

            <div className="ms-auto flex items-center gap-2" dir="rtl">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex lg:hidden"
              >
                فتح المتجر <ExternalLink className="size-3.5" />
              </a>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-xs text-slate-600 shadow-sm lg:hidden"
                onClick={() => void signOut()}
              >
                <LogOut className="me-1 size-3.5" /> خروج
              </Button>
            </div>
          </header>

          <main className="min-w-0 p-4 sm:p-6 lg:p-8" dir="rtl">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
