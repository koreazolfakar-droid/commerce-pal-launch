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
import { useEffect, useState } from "react";

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
    label: "محتوى المتجر",
    items: [
      { to: "/dashboard/hero", label: "صور الهيرو", icon: Image },
      { to: "/dashboard/sections", label: "أقسام الصفحة", icon: Layers3 },
      { to: "/dashboard/navigation", label: "القوائم والأيقونات", icon: Menu },
      { to: "/dashboard/brands", label: "البراندات", icon: Tags },
    ],
  },
  {
    label: "التسويق والنظام",
    items: [
      { to: "/dashboard/seo", label: "SEO", icon: Search },
      { to: "/dashboard/settings", label: "الإعدادات", icon: Settings },
    ],
  },
] as const;

function DashboardNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-5" aria-label="تنقل لوحة التحكم">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/75">
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
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                  }}
                  onClick={onNavigate}
                  className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
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
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-300">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">جارٍ التحقق من جلسة الإدارة…</p>
        </div>
      </div>
    );
  }

  if (!session) return <AdminLogin onSignedIn={refresh} />;

  if (!role) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground transition-colors duration-300"
        dir="rtl"
      >
        <div className="fixed left-4 top-4 z-40 sm:left-6 sm:top-6">
          <ThemeToggle className="border border-border/70 bg-card/95 shadow-sm backdrop-blur hover:bg-muted" />
        </div>

        <div className="w-full max-w-md space-y-4 rounded-[1.75rem] border border-border/70 bg-card p-6 text-center shadow-card transition-colors duration-300">
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

  return (
    <div className="min-h-screen bg-muted/20 text-foreground transition-colors duration-300" dir="rtl">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 flex-col border-l border-border/70 bg-card lg:flex">
        <div className="border-b border-border/70 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Store className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight">Space Call</p>
              <p className="mt-0.5 text-xs text-muted-foreground">لوحة إدارة المتجر</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <DashboardNavigation />
        </div>

        <div className="space-y-3 border-t border-border/70 p-4">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
              جلسة محمية
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{session.user.email}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              الصلاحية: {role === "admin" ? "مدير" : "محرّر"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,320px)] flex-col border-l border-border bg-card shadow-2xl lg:hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Store className="size-5" />
                </span>
                <div>
                  <p className="font-black">Space Call</p>
                  <p className="text-[11px] text-muted-foreground">لوحة الإدارة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="إغلاق القائمة"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <DashboardNavigation onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="border-t border-border/70 p-4">
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
              >
                <LogOut className="size-4" /> تسجيل الخروج
              </button>
            </div>
          </aside>
        </>
      ) : null}

      <div className="min-h-screen lg:pr-72">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="فتح قائمة لوحة التحكم"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black sm:text-base">إدارة Space Call</p>
                  <span className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 sm:inline-flex dark:text-emerald-400">
                    <ShieldCheck className="size-3" /> آمن
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {role === "admin" ? "مدير النظام" : "محرّر المحتوى"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold transition-colors hover:bg-muted sm:inline-flex"
              >
                <ExternalLink className="size-4" /> عرض المتجر
              </a>
              <ThemeToggle className="border border-border/70 bg-card shadow-sm hover:bg-muted" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
