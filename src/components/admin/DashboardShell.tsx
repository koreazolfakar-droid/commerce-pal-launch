import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Image,
  Languages,
  Layers3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const NAV_GROUPS = [
  {
    ar: "الرئيسية",
    en: "Home",
    items: [{ to: "/dashboard", ar: "نظرة عامة", en: "Overview", icon: LayoutDashboard }],
  },
  {
    ar: "إدارة المحتوى",
    en: "Content",
    items: [
      { to: "/dashboard/hero", ar: "صور الهيرو", en: "Hero slides", icon: Image },
      { to: "/dashboard/sections", ar: "أقسام الصفحة", en: "Page sections", icon: Layers3 },
      {
        to: "/dashboard/navigation",
        ar: "القوائم والأيقونات",
        en: "Navigation & icons",
        icon: Menu,
      },
      { to: "/dashboard/brands", ar: "البراندات", en: "Brands", icon: Tags },
    ],
  },
  {
    ar: "المتجر",
    en: "Store",
    items: [
      { to: "/dashboard/orders", ar: "الطلبات", en: "Orders", icon: ShoppingBag },
      { to: "/dashboard/customers", ar: "العملاء", en: "Customers", icon: UsersRound },
      { to: "/dashboard/products", ar: "المنتجات", en: "Products", icon: Store },
      { to: "/dashboard/inventory", ar: "المخزون", en: "Inventory", icon: Package },
      { to: "/dashboard/categories", ar: "التصنيفات", en: "Categories", icon: Layers3 },
      { to: "/dashboard/collections", ar: "المجموعات", en: "Collections", icon: Tags },
      { to: "/dashboard/seo", ar: "SEO", en: "SEO", icon: Search },
      { to: "/dashboard/settings", ar: "الإعدادات", en: "Settings", icon: Settings },
    ],
  },
] as const;

type DashboardNavItem = (typeof NAV_GROUPS)[number]["items"][number];

function DashboardNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { language, text } = useDashboardLanguage();

  return (
    <nav className="space-y-6" aria-label={text("تنقل لوحة التحكم", "Dashboard navigation")}>
      {NAV_GROUPS.map((group) => {
        const groupLabel = language === "ar" ? group.ar : group.en;
        return (
          <div key={group.en}>
            <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.08em] text-muted-foreground/60">
              {groupLabel}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const label = language === "ar" ? item.ar : item.en;
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
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function LanguageToggle() {
  const { language, toggleLanguage, text } = useDashboardLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-card px-3 text-xs font-bold transition-colors hover:bg-muted"
      aria-label={text("تغيير لغة لوحة التحكم", "Change dashboard language")}
      title={text("تغيير اللغة", "Change language")}
    >
      <Languages className="size-4" />
      <span>{language === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}

/** Dashboard chrome: requires a valid Supabase session plus an explicit staff role. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, session, role, refresh } = useAdminSession();
  const { language, direction, text } = useDashboardLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = useMemo(() => NAV_GROUPS.flatMap<DashboardNavItem>((group) => group.items), []);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return navItems
      .filter((item) => `${item.ar} ${item.en}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [navItems, searchQuery]);

  useEffect(() => {
    if (!session || !role) return;

    let timer: number | undefined;
    let signingOut = false;

    const expireSession = async () => {
      if (signingOut) return;
      signingOut = true;
      await supabase.auth.signOut();
      toast.info(
        text(
          "انتهت جلسة الإدارة بعد 30 دقيقة من عدم النشاط.",
          "Your admin session expired after 30 minutes of inactivity.",
        ),
      );
      await refresh();
    };

    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void expireSession(), ADMIN_IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) =>
      window.addEventListener(eventName, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [refresh, role, session, text]);

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
      <div
        className="flex min-h-screen items-center justify-center bg-muted/20 text-foreground transition-colors duration-300"
        dir={direction}
      >
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-foreground" />
          <p className="text-xs text-muted-foreground">
            {text("جارٍ التحقق من جلسة الإدارة…", "Checking your admin session…")}
          </p>
        </div>
      </div>
    );
  }

  if (!session) return <AdminLogin onSignedIn={refresh} />;

  if (!role) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center bg-muted/20 px-4 text-foreground transition-colors duration-300"
        dir={direction}
      >
        <div className="fixed start-4 top-4 z-40 flex gap-2 sm:start-6 sm:top-6">
          <LanguageToggle />
          <ThemeToggle className="border border-border/70 bg-card shadow-sm hover:bg-muted" />
        </div>

        <div className="w-full max-w-md space-y-4 rounded-3xl border border-border/70 bg-card p-7 text-center shadow-sm transition-colors duration-300">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              {text("الحساب غير مخوّل", "Account not authorized")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {text(
                "تم التحقق من تسجيل الدخول، لكن هذا الحساب لا يملك صلاحية Admin أو Editor للوحة Space Call. لن يتم منح أي صلاحية تلقائياً.",
                "Sign-in succeeded, but this account does not have an Admin or Editor role for the Space Call dashboard. No permissions will be granted automatically.",
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
            {text(
              "يجب أن يضيف مدير معتمد صلاحية الحساب من جهة الإدارة أو من Supabase باستخدام مسار موثوق.",
              "An authorized administrator must assign this account a role through the trusted admin flow or Supabase.",
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void supabase.auth.signOut().then(refresh)}
          >
            <LogOut className="me-2 size-4" /> {text("تسجيل الخروج", "Sign out")}
          </Button>
        </div>
      </div>
    );
  }

  const signOut = () => void supabase.auth.signOut().then(refresh);
  const userInitial = (session.user.email?.trim().charAt(0) || "S").toUpperCase();

  return (
    <div
      className="min-h-screen bg-[#f7f7f5] text-foreground transition-colors duration-300 dark:bg-background"
      dir={direction}
      data-dashboard-language={language}
    >
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-border/70 bg-card lg:flex">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
              <Store className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black tracking-tight">Space Call</p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                {text("إدارة المتجر", "E-commerce Admin")}
              </p>
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
                  {role === "admin" ? text("مدير", "Administrator") : text("محرر", "Editor")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" /> {text("تسجيل الخروج", "Sign out")}
            </button>
          </div>
        </div>
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            aria-label={text("إغلاق القائمة", "Close menu")}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 start-0 z-50 flex w-[min(86vw,320px)] flex-col border-e border-border bg-card shadow-2xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
                  <Store className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-black">Space Call</p>
                  <p className="text-[10px] text-muted-foreground">
                    {text("إدارة المتجر", "E-commerce Admin")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={text("إغلاق القائمة", "Close menu")}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto border-t border-border/60 px-4 py-5">
              <DashboardNavigation onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="border-t border-border/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle className="border border-border/70 bg-card shadow-none hover:bg-muted" />
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
              >
                <LogOut className="size-4" /> {text("تسجيل الخروج", "Sign out")}
              </button>
            </div>
          </aside>
        </>
      ) : null}

      <div className="min-h-screen lg:ps-64">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="flex min-h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-7">
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label={text("فتح قائمة لوحة التحكم", "Open dashboard menu")}
            >
              <Menu className="size-5" />
            </button>

            <div className="relative hidden w-full max-w-md md:block">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={text("ابحث في لوحة التحكم...", "Search the dashboard...")}
                className="h-10 w-full rounded-xl border border-border/70 bg-muted/30 pe-4 ps-10 text-xs font-medium outline-none transition focus:border-foreground/25 focus:bg-background focus:ring-2 focus:ring-foreground/5"
              />
              {searchQuery.trim() ? (
                <div className="absolute start-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {searchResults.length ? (
                    searchResults.map((item) => {
                      const Icon = item.icon;
                      const label = language === "ar" ? item.ar : item.en;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setSearchQuery("")}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Icon className="size-4" /> {label}
                        </Link>
                      );
                    })
                  ) : (
                    <p className="px-3 py-3 text-xs text-muted-foreground">
                      {text("لا توجد نتائج مطابقة.", "No matching results.")}
                    </p>
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
                <ExternalLink className="size-3.5" /> {text("عرض المتجر", "View store")}
              </a>
              <LanguageToggle />
              <ThemeToggle className="border border-border/70 bg-card shadow-none hover:bg-muted" />
              <div className="hidden items-center gap-2 border-s border-border/70 ps-2 sm:flex">
                <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-black text-background">
                  {userInitial}
                </span>
                <div className="hidden max-w-36 lg:block">
                  <p className="truncate text-[11px] font-bold">{session.user.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {role === "admin" ? text("مدير", "Admin") : text("محرر", "Editor")}
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
