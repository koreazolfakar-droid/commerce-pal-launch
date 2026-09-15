import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";

import { AdminLogin } from "@/components/admin/AdminLogin";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard" as never)({
  head: () => ({
    meta: [
      { title: "Space Call Dashboard" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const admin = useAdminSession();

  if (admin.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحقق من صلاحية لوحة التحكم…
        </div>
      </div>
    );
  }

  if (!admin.session) return <AdminLogin onSignedIn={admin.refresh} />;

  if (!admin.role) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4" dir="rtl">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-float sm:p-8">
          <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black">الحساب غير مخوّل بعد</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            تم تسجيل الدخول{admin.email ? ` باسم ${admin.email}` : ""}، لكن هذا الحساب لا يملك دور Admin أو Editor في لوحة Space Call.
          </p>
          {admin.setupRequired ? (
            <p className="mt-3 rounded-2xl bg-muted/60 p-4 text-xs leading-6 text-muted-foreground">
              يجب اعتماد الحساب من جهة موثوقة في إعدادات الخادم. لا توجد ترقية تلقائية لأول مستخدم لأسباب أمنية.
            </p>
          ) : null}
          {admin.error ? (
            <p className="mt-3 rounded-2xl bg-destructive/10 p-4 text-xs text-destructive">{admin.error}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void admin.refresh()}>
              إعادة التحقق
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void supabase.auth.signOut().then(() => window.location.assign("/dashboard"));
              }}
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell role={admin.role} email={admin.email}>
      <Outlet />
    </DashboardShell>
  );
}
