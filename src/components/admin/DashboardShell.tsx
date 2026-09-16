import { Link } from "@tanstack/react-router";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const NAV = [
  { to: "/dashboard", label: "نظرة عامة" },
  { to: "/dashboard/hero", label: "صور الهيرو" },
  { to: "/dashboard/sections", label: "أقسام الصفحة" },
  { to: "/dashboard/navigation", label: "القوائم والأيقونات" },
  { to: "/dashboard/brands", label: "البراندات" },
  { to: "/dashboard/seo", label: "SEO" },
  { to: "/dashboard/settings", label: "الإعدادات" },
] as const;

/** Dashboard chrome: requires a valid Supabase session plus an explicit staff role. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, session, role, refresh } = useAdminSession();

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
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground transition-colors duration-300" dir="rtl">
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

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur transition-colors duration-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">لوحة تحكم Space Call</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3" /> جلسة محمية
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {session.user.email} · {role === "admin" ? "مدير" : "محرّر"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="border border-border/70 bg-background/70 shadow-sm hover:bg-muted" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void supabase.auth.signOut().then(refresh)}
            >
              <LogOut className="me-1 size-4" /> خروج
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/dashboard" }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
