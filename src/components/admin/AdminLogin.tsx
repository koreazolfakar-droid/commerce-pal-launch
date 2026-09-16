import { useState } from "react";
import { LayoutDashboard, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dashboard authentication. Creating an Auth account never grants dashboard
 * privileges; roles are provisioned separately by a trusted operator.
 */
export function AdminLogin({ onSignedIn }: { onSignedIn: () => Promise<void> | void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;

        if (data.session) {
          toast.success("تم إنشاء الحساب. يحتاج الحساب إلى موافقة مدير قبل استخدام اللوحة.");
          await onSignedIn();
        } else {
          toast.success("تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجل الدخول.");
          setMode("signin");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await onSignedIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/35 px-4 py-8 sm:py-12" dir="rtl">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-5xl overflow-hidden rounded-[32px] border border-border bg-card shadow-float lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 size-72 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Space Call" className="size-11 rounded-2xl bg-white p-1.5" />
              <div>
                <p className="text-sm font-black">Space Call</p>
                <p className="text-xs text-white/55">Commerce Dashboard</p>
              </div>
            </div>

            <div className="mt-16 max-w-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-blue-200">
                <LayoutDashboard className="size-3.5" /> إدارة المتجر
              </span>
              <h2 className="mt-5 text-4xl font-black leading-tight">كل تحكم Space Call في مكان واحد.</h2>
              <p className="mt-4 text-sm leading-7 text-white/60">
                عدّل الهيرو، الأقسام، القوائم، البراندات، SEO وإعدادات الموقع من لوحة مستقلة وآمنة.
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/60">
            <div className="flex items-center gap-2 font-bold text-white">
              <ShieldCheck className="size-4 text-emerald-300" /> حماية الصلاحيات
            </div>
            <p className="mt-2">أي حساب جديد يحتاج اعتماداً منفصلاً قبل الوصول إلى محتوى الإدارة.</p>
          </div>
        </aside>

        <main className="flex items-center justify-center p-5 sm:p-10 lg:p-14">
          <form onSubmit={submit} className="w-full max-w-md space-y-6">
            <div>
              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <img src="/logo.svg" alt="Space Call" className="size-10" />
                <div>
                  <p className="text-sm font-black">Space Call</p>
                  <p className="text-[11px] text-muted-foreground">Commerce Dashboard</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                <ShieldCheck className="size-3.5" /> Secure Admin
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
                {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب دخول"}
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {mode === "signin"
                  ? "ادخل بحساب الإدارة المعتمد للوصول إلى لوحة Space Call."
                  : "أنشئ حساباً، ثم يجب أن يمنحه المدير صلاحية Admin أو Editor."}
              </p>
            </div>

            <div className="space-y-4 rounded-[24px] border border-border bg-background/60 p-5">
              <div className="space-y-2">
                <Label htmlFor="dashboard-email" className="text-xs font-bold">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="dashboard-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-xl bg-card"
                  placeholder="admin@spacecall.com"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard-password" className="text-xs font-bold">
                  كلمة المرور
                </Label>
                <Input
                  id="dashboard-password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-xl bg-card"
                  dir="ltr"
                />
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
                {busy ? (
                  <Loader2 className="me-2 size-4 animate-spin" />
                ) : (
                  <LockKeyhole className="me-2 size-4" />
                )}
                {mode === "signin" ? "دخول إلى Dashboard" : "إنشاء حساب الدخول"}
              </Button>
            </div>

            <button
              type="button"
              className="w-full text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
            >
              {mode === "signin" ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
            </button>

            <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs leading-6 text-muted-foreground">
              إنشاء الحساب لا يمنح صلاحية الإدارة تلقائياً، ولا يتم إرسال أي مفتاح Admin إلى المتصفح.
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
