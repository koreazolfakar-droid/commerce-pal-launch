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
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardRole } from "@/lib/cmsAdmin.server";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/hero", label: "Hero", icon: Image },
  { href: "/dashboard/sections", label: "الأقسام", icon: PanelsTopLeft },
  { href: "/dashboard/navigation", label: "التنقل", icon: Menu },
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
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center gap-3 px-4 lg:px-6">
          <a href="/dashboard" className="flex min-w-0 items-center gap-3">
            <img src="/logo.svg" alt="Space Call" width={36} height={36} className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Space Call Dashboard</p>
              <p className="truncate text-[11px] text-muted-foreground">إدارة محتوى الموقع</p>
            </div>
          </a>
          <div className="ms-auto flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent sm:inline-flex"
            >
              فتح المتجر <ExternalLink className="size-3.5" />
            </a>
            <Button size="sm" variant="ghost" onClick={() => void signOut()}>
              <LogOut className="me-1 size-4" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card/30 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-l">
          <div className="overflow-x-auto px-3 py-3 lg:sticky lg:top-16 lg:overflow-visible lg:p-4">
            <nav className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
              {items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-5 hidden rounded-2xl border border-border bg-background p-3 text-xs lg:block">
              <p className="font-bold">{email ?? "حساب الإدارة"}</p>
              <p className="mt-1 text-muted-foreground">
                الصلاحية: {role === "admin" ? "مدير" : "محرر"}
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
