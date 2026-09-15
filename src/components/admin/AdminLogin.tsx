import { useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10" dir="rtl">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-6 shadow-float sm:p-8"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Space Call</p>
            <h1 className="mt-1 text-2xl font-black text-foreground">لوحة التحكم</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "سجل الدخول بحساب إداري معتمد."
                : "أنشئ حساب دخول، ثم يجب أن يمنحه المدير صلاحية منفصلة."}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-email">البريد الإلكتروني</Label>
          <Input
            id="dashboard-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-password">كلمة المرور</Label>
          <Input
            id="dashboard-password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="me-2 size-4 animate-spin" /> : <LockKeyhole className="me-2 size-4" />}
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب الدخول"}
        </Button>

        <button
          type="button"
          className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
        </button>

        <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs leading-6 text-muted-foreground">
          إنشاء الحساب لا يمنح صلاحيات الإدارة تلقائياً. هذه الحماية تمنع أي زائر من تحويل نفسه إلى مدير.
        </p>
      </form>
    </div>
  );
}
