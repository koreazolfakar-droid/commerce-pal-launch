import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Image,
  Layers3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const NAV_GROUPS = [
  {
    label: "الرئيسية",
    items: [{ to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard }],
  },
  {
    label: "إدارة المحتوى",
    items: [
      { to: "/dashboard/hero", label: "صور الهيرو", icon: Image },
      { to: "/dashboard/sections", label: "أقسام الصفحة", icon: Layers3 },
      { to: "/dashboard/navigation", label: "القوائم والأيقونات", icon: Menu },
      { to: "/dashboard/brands", label: "البراندات", icon: Tags },
    ],
  },
  {
    label: "المتجر",
    items: [
      { to: "/dashboard/seo", label: "SEO", icon: Search },
      { to: "/dashboard/settings", label: "الإعدادات", icon: Settings },
    ],
  },
] as const;

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function DashboardNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-6" aria-label="تنقل لوحة التحكم">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.08em] text-muted-foreground/60">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/dashboard" }}
                  activeProps={{
                    className:
                      "bg-foreground text-background shadow-sm hover:bg-foreground hover:text-background",
                  }}
                  onClick={onNavigate}
                  className="group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Dashboard chrome: requires a valid Supabase session plus an explicit staff role. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, session, role, refresh } = useAdminSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 6);
  }, [searchQuery]);

  useEffect(() => {
    if (!session || !role) return;

    let timer: number | undefined;
    let signingOut = false;

    const expireSession = async () => {
      if (signingOut) return;
      signingOut = true;
      await supabase.auth.signOut();
      toast.info("انتهت جلسة الإدارة بعد 30 دقيقة من عدم النشاط.");
      await refresh();
    };

    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void expireSession(), ADMIN_IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [refresh, role, session]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 text-foreground transition-colors duration-300">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-foreground" />
          <p className="text-xs text-muted-foreground">جارٍ التحقق من جلسة الإدارة…</p>
        </div>
      </div>
    );
  }

  if (!session) return <AdminLogin onSignedIn={refresh} />;

  if (!role) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center bg-muted/20 px-4 text-foreground transition-colors duration-300"
        dir="rtl"
      >
        <div className="fixed left-4 top-4 z-40 sm:left-6 sm:top-6">
          <ThemeToggle className="border border-border/70 bg-card shadow-sm hover:bg-muted" />
        </div>

        <div className="w-full max-w-md space-y-4 rounded-3xl border border-border/70 bg-card p-7 text-center shadow-sm transition-colors duration-300">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">الحساب غير مخوّل</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              تم التحقق من تسجيل الدخول، لكن هذا الحساب لا يملك صلاحية Admin أو Editor للوحة Space Call.
              لن يتم منح أي صلاحية تلقائياً.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
            يجب أن يضيف مدير معتمد صلاحية الحساب من جهة الإدارة أو من Supabase باستخدام مسار موثوق.
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void supabase.auth.signOut().then(refresh)}
          >
            <LogOut className="me-2 size-4" /> تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  const signOut = () => void supabase.auth.signOut().then(refresh);
  const userInitial = (session.user.email?.trim().charAt(0) || "S").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-foreground transition-colors duration-300 dark:bg-background" dir="rtl">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 flex-col border-l border-border/70 bg-card lg:flex">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
              <Store className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black tracking-tight">Space Call</p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">E-commerce Admin</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DashboardNavigation />
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-border/70 bg-muted/25 p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-xs font-black text-background">
                {userInitial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{session.user.email}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {role === "admin" ? "Administrator" : "Editor"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" /> تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,320px)] flex-col border-l border-border bg-card shadow-2xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
                  <Store className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-black">Space Call</p>
                  <p className="text-[10px] text-muted-foreground">E-commerce Admin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="إغلاق القائمة"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto border-t border-border/60 px-4 py-5">
              <DashboardNavigation onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="border-t border-border/60 p-4">
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
              >
                <LogOut className="size-4" /> تسجيل الخروج
              </button>
            </div>
          </aside>
        </>
      ) : null}

      <div className="min-h-screen lg:pr-64">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="flex min-h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-7">
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="فتح قائمة لوحة التحكم"
            >
              <Menu className="size-5" />
            </button>

            <div className="relative hidden w-full max-w-md md:block">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث في لوحة التحكم..."
                className="h-10 w-full rounded-xl border border-border/70 bg-muted/30 pe-4 ps-10 text-xs font-medium outline-none transition focus:border-foreground/25 focus:bg-background focus:ring-2 focus:ring-foreground/5"
              />
              {searchQuery.trim() ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {searchResults.length ? (
                    searchResults.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setSearchQuery("")}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Icon className="size-4" /> {item.label}
                        </Link>
                      );
                    })
                  ) : (
                    <p className="px-3 py-3 text-xs text-muted-foreground">لا توجد نتائج مطابقة.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="ms-auto flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-[10px] font-bold text-muted-foreground xl:inline-flex">
                <span className="size-2 rounded-full bg-emerald-500" /> CMS Live
              </span>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-card px-3 text-xs font-bold transition-colors hover:bg-muted sm:inline-flex"
              >
                <ExternalLink className="size-3.5" /> عرض المتجر
              </a>
              <ThemeToggle className="border border-border/70 bg-card shadow-none hover:bg-muted" />
              <div className="hidden items-center gap-2 border-r border-border/70 pr-2 sm:flex">
                <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-black text-background">
                  {userInitial}
                </span>
                <div className="hidden max-w-36 lg:block">
                  <p className="truncate text-[11px] font-bold">{session.user.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {role === "admin" ? "Admin" : "Editor"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
