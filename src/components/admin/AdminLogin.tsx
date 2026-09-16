import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Store, Wifi } from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const MAX_LOCAL_ATTEMPTS = 5;
const LOCAL_LOCK_MS = 60_000;
const FAILURE_KEY = "spacecall-admin-login-failures";
const LOCK_KEY = "spacecall-admin-login-lock-until";

function readStoredNumber(key: string) {
  if (typeof window === "undefined") return 0;
  const value = Number(window.sessionStorage.getItem(key) ?? "0");
  return Number.isFinite(value) ? value : 0;
}

function writeStoredNumber(key: string, value: number) {
  if (typeof window === "undefined") return;
  if (value <= 0) window.sessionStorage.removeItem(key);
  else window.sessionStorage.setItem(key, String(value));
}

/** Private dashboard sign-in. Account creation and role grants are admin-only. */
export function AdminLogin({ onSignedIn }: { onSignedIn: () => Promise<void> | void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(() => readStoredNumber(FAILURE_KEY));
  const [lockUntil, setLockUntil] = useState(() => readStoredNumber(LOCK_KEY));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lockUntil) return;

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockUntil) {
        setFailures(0);
        setLockUntil(0);
        writeStoredNumber(FAILURE_KEY, 0);
        writeStoredNumber(LOCK_KEY, 0);
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockUntil]);

  const secondsLocked = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = secondsLocked > 0;

  const resetFailures = () => {
    setFailures(0);
    setLockUntil(0);
    writeStoredNumber(FAILURE_KEY, 0);
    writeStoredNumber(LOCK_KEY, 0);
  };

  const recordFailure = () => {
    const nextFailures = failures + 1;
    if (nextFailures >= MAX_LOCAL_ATTEMPTS) {
      const nextLockUntil = Date.now() + LOCAL_LOCK_MS;
      setFailures(MAX_LOCAL_ATTEMPTS);
      setLockUntil(nextLockUntil);
      setNow(Date.now());
      writeStoredNumber(FAILURE_KEY, MAX_LOCAL_ATTEMPTS);
      writeStoredNumber(LOCK_KEY, nextLockUntil);
      return;
    }

    setFailures(nextFailures);
    writeStoredNumber(FAILURE_KEY, nextFailures);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (locked) {
      toast.error(`محاولات كثيرة. حاول مجدداً بعد ${secondsLocked} ثانية.`);
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        recordFailure();
        toast.error("تعذّر تسجيل الدخول. تحقق من بيانات الحساب المعتمد وحاول مجدداً.");
        return;
      }

      resetFailures();
      await onSignedIn();
    } catch {
      recordFailure();
      toast.error("تعذّر تسجيل الدخول. حاول مجدداً بعد قليل.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="fixed left-4 top-4 z-40 sm:left-6 sm:top-6">
        <ThemeToggle className="border border-border/70 bg-card/95 shadow-sm backdrop-blur hover:bg-muted" />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-5xl items-center gap-6 px-4 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-6">
        <aside className="hidden rounded-[2rem] border border-border/70 bg-card p-8 shadow-card transition-colors duration-300 lg:block">
          <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-black tracking-tight text-foreground">Space Call Admin</p>
              <p className="text-xs text-muted-foreground">بوابة إدارة خاصة</p>
            </div>
          </div>

          <h1 className="max-w-md text-3xl font-black leading-tight tracking-tight text-foreground">
            إدارة المتجر محمية بصلاحيات منفصلة عن حسابات العملاء.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            إنشاء الحسابات الإدارية ومنح الصلاحيات لا يتمان من هذه الصفحة. فقط الحسابات التي تم اعتمادها مسبقاً تستطيع الوصول إلى لوحة التحكم.
          </p>

          <div className="mt-8 space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 transition-colors duration-300">
              <LockKeyhole className="size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-foreground">صلاحيات RLS محمية</p>
                <p className="mt-0.5 text-xs text-muted-foreground">لا يمكن للمستخدم منح نفسه Admin أو Editor.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 transition-colors duration-300">
              <Wifi className="size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-foreground">اتصال Supabase آمن</p>
                <p className="mt-0.5 text-xs text-muted-foreground">الجلسة والصلاحية يتم التحقق منهما قبل عرض أدوات الإدارة.</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="mx-auto w-full max-w-md">
          <form
            onSubmit={submit}
            className="space-y-5 rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-card transition-colors duration-300 sm:p-7"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <LockKeyhole className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-foreground">تسجيل دخول الإدارة</h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  الحسابات المعتمدة فقط يمكنها الدخول.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground lg:hidden">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                بوابة خاصة ومحمية
              </div>
              <p className="mt-1">إنشاء الحسابات ومنح الصلاحيات مغلقان من هذه الصفحة.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">البريد الإلكتروني</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-xl"
                placeholder="admin@spacecall..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-xl pe-12"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 end-0 grid w-12 place-items-center text-muted-foreground transition hover:text-foreground"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl font-bold" disabled={busy || locked}>
              {busy ? <Loader2 className="me-2 size-4 animate-spin" /> : <LockKeyhole className="me-2 size-4" />}
              {locked ? `مقفل مؤقتاً · ${secondsLocked}ث` : "دخول آمن"}
            </Button>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Supabase Auth
              </span>
              <a href="/" className="inline-flex items-center gap-1 font-semibold hover:text-primary">
                <Store className="size-3.5" /> العودة للمتجر
              </a>
            </div>
          </form>

          <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
            لا توجد ميزة تسجيل عام هنا. إذا لم يكن حسابك مخولاً، تواصل مع مدير النظام.
          </p>
        </main>
      </div>
    </div>
  );
}
