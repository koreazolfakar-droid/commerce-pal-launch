import { Languages, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/dashboard/components/DashboardSidebar";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import "@/styles/admin-dashboard.css";

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SIDEBAR_STORAGE_KEY = "spacecall:dashboard-sidebar-collapsed";

function LanguageToggle() {
  const { language, toggleLanguage, text } = useDashboardLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-card px-3 text-xs font-bold transition-colors hover:bg-muted"
      aria-label={text("تغيير لغة لوحة التحكم", "Change dashboard language")}
    >
      <Languages className="size-4" />
      <span>{language === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}

/** Private Space Call admin shell. Authentication and staff authorization remain Supabase/RLS-backed. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, session, role, refresh } = useAdminSession();
  const { language, direction, text } = useDashboardLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
    } catch {
      setSidebarCollapsed(false);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Local storage may be unavailable in strict privacy contexts.
      }
      return next;
    });
  };

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
        className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-foreground dark:bg-background"
        dir={direction}
      >
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
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
        className="relative flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 text-foreground dark:bg-background"
        dir={direction}
      >
        <div className="fixed start-4 top-4 z-40 flex gap-2 sm:start-6 sm:top-6">
          <LanguageToggle />
          <ThemeToggle className="border border-border/70 bg-card shadow-sm hover:bg-muted" />
        </div>
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-border/70 bg-card p-7 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {text("الحساب غير مخوّل", "Account not authorized")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {text(
                "تم تسجيل الدخول بنجاح، لكن هذا الحساب لا يملك صلاحية Admin أو Editor للوحة Space Call.",
                "Sign-in succeeded, but this account does not have an Admin or Editor role for the Space Call dashboard.",
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
            {text(
              "يجب أن يمنح مدير معتمد الصلاحية عبر مسار الإدارة الموثوق أو Supabase.",
              "An authorized administrator must assign access through the trusted admin flow or Supabase.",
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

  return (
    <div
      className="spacecall-admin-dashboard min-h-screen bg-[#f5f7fb] text-foreground dark:bg-background"
      dir={direction}
      data-dashboard-language={language}
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
    >
      <aside
        className={`fixed inset-y-0 start-0 z-40 hidden overflow-hidden border-e border-slate-800/80 transition-[width] duration-200 lg:block ${sidebarCollapsed ? "w-[80px]" : "w-[252px]"}`}
      >
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          onSignOut={signOut}
        />
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label={text("إغلاق القائمة", "Close menu")}
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-[min(88vw,320px)] overflow-hidden shadow-2xl lg:hidden">
            <DashboardSidebar
              collapsed={false}
              mobile
              onClose={() => setMobileNavOpen(false)}
              onSignOut={signOut}
            />
          </aside>
        </>
      ) : null}

      <div
        className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? "lg:ps-[80px]" : "lg:ps-[252px]"}`}
      >
        <DashboardHeader
          email={session.user.email ?? "admin@spacecallapp.store"}
          role={role}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="spacecall-admin-content mx-auto w-full max-w-[1720px] px-3.5 py-4 sm:px-5 sm:py-5 lg:px-6 xl:px-7 xl:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
