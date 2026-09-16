import { Link } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

import { AdminLogin } from "@/components/admin/AdminLogin";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "نظرة عامة" },
  { to: "/dashboard/hero", label: "صور الهيرو" },
  { to: "/dashboard/sections", label: "أقسام الصفحة" },
  { to: "/dashboard/navigation", label: "القوائم والأيقونات" },
  { to: "/dashboard/brands", label: "البراندات" },
  { to: "/dashboard/seo", label: "SEO" },
  { to: "/dashboard/settings", label: "الإعدادات" },
] as const;

/** Dashboard chrome: gates on session + staff role, then renders navigation. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, session, role, refresh } = useAdminSession();
  const [claiming, setClaiming] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const attemptedBootstrapFor = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (loading || !userId || role || attemptedBootstrapFor.current === userId) return;

    attemptedBootstrapFor.current = userId;
    let active = true;
    setClaiming(true);
    setBootstrapError(null);

    void (async () => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "admin",
      });

      if (!active) return;

      if (error) {
        setClaiming(false);
        if (error.message.includes("dashboard_bootstrap_closed")) {
          setBootstrapError("تم إعداد لوحة الإدارة مسبقاً. استخدم حساب مدير معتمد.");
        } else {
          setBootstrapError(error.message);
        }
        return;
      }

      setClaiming(false);
      await refresh();
      if (active) toast.success("تم إعداد أول حساب مدير تلقائياً");
    })();

    return () => {
      active = false;
    };
  }, [loading, refresh, role, session?.user.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <AdminLogin onSignedIn={refresh} />;

  if (!role) {
    if (claiming) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4" dir="rtl">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <h1 className="text-lg font-semibold text-foreground">جارٍ إعداد حساب المدير</h1>
            <p className="text-sm text-muted-foreground">يتم الآن التحقق من أول حساب وربطه بلوحة التحكم.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">لا توجد صلاحية إدارية</h1>
          <p className="text-sm text-muted-foreground">
            {bootstrapError ?? "تعذّر إكمال إعداد صلاحية المدير تلقائياً."}
          </p>
          {bootstrapError && !bootstrapError.includes("تم إعداد لوحة الإدارة مسبقاً") ? (
            <Button
              className="w-full"
              onClick={() => {
                attemptedBootstrapFor.current = null;
                setBootstrapError(null);
                void refresh();
              }}
            >
              إعادة المحاولة
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void supabase.auth.signOut().then(refresh)}
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">لوحة تحكم Space Call</p>
            <p className="text-xs text-muted-foreground">
              {session.user.email} · {role === "admin" ? "مدير" : "محرّر"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void supabase.auth.signOut().then(refresh)}
          >
            <LogOut className="me-1 size-4" /> خروج
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/dashboard" }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted"
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
