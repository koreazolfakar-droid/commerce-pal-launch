import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/storeConfig";

const DASHBOARD_REDIRECT_URL = `${SITE_URL}/dashboard`;

/**
 * Dashboard authentication card. Account creation only creates a normal
 * Supabase auth user; privileged access is granted separately by the guarded
 * first-admin bootstrap or by an existing administrator.
 */
export function AdminLogin({ onSignedIn }: { onSignedIn: () => Promise<void> | void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: DASHBOARD_REDIRECT_URL },
        });
        if (error) throw error;

        if (data.session) {
          setAwaitingConfirmation(false);
          toast.success("تم إنشاء الحساب وتسجيل الدخول.");
          await onSignedIn();
        } else {
          setAwaitingConfirmation(true);
          toast.success("تم إنشاء الحساب. افتح رسالة التأكيد ثم ارجع إلى لوحة التحكم.");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAwaitingConfirmation(false);
      await onSignedIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email) {
      toast.error("أدخل البريد الإلكتروني أولاً");
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: DASHBOARD_REDIRECT_URL },
      });
      if (error) throw error;
      toast.success("تم إرسال رسالة تأكيد جديدة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إعادة إرسال رسالة التأكيد");
    } finally {
      setResending(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setAwaitingConfirmation(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold text-foreground">لوحة تحكم Space Call</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "سجّل الدخول بحساب إداري" : "أنشئ حساب الإدارة الأول"}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-email">البريد الإلكتروني</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">كلمة المرور</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="me-1 size-4 animate-spin" /> : null}
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}
        </Button>

        {mode === "signup" && awaitingConfirmation ? (
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="text-muted-foreground">
              إذا لم تصلك رسالة التأكيد، افحص Spam أولاً ثم أعد إرسالها من هنا.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resending}
              onClick={() => void resendConfirmation()}
            >
              {resending ? <Loader2 className="me-1 size-4 animate-spin" /> : null}
              إعادة إرسال رسالة التأكيد
            </Button>
          </div>
        ) : null}

        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline"
          onClick={switchMode}
        >
          {mode === "signin" ? "أول مرة؟ أنشئ حساب الإدارة" : "لدي حساب بالفعل"}
        </button>
      </form>
    </div>
  );
}
