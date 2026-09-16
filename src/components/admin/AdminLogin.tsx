import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sign-in only card for the dashboard.
 * Admin/editor accounts must be provisioned through the trusted backend;
 * the public application never creates privileged accounts.
 */
export function AdminLogin({ onSignedIn }: { onSignedIn: () => Promise<void> | void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. سجّل الدخول الآن.");
        setMode("signin");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await onSignedIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold text-foreground">لوحة تحكم Space Call</h1>
          <p className="mt-1 text-sm text-muted-foreground">سجّل الدخول بحساب إداري معتمد</p>
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
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="me-1 size-4 animate-spin" /> : null}
          تسجيل الدخول
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          إنشاء حسابات الإدارة يتم من جهة موثوقة فقط.
        </p>
      </form>
    </div>
  );
}
