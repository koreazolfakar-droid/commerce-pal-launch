import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardMfaStep from "@/dashboard/components/auth/DashboardMfaStep";
import TurnstileChallenge from "@/dashboard/components/auth/TurnstileChallenge";
import {
  getDashboardMfaStatus,
  isDashboardTurnstileConfigured,
  requestDashboardPasswordReset,
  signInDashboard,
  updateDashboardPassword,
} from "@/dashboard/data/catalog";

type LoginView = "signin" | "forgot" | "recovery" | "mfa";

const EMAIL_STORAGE_KEY = "spacecall-dashboard-email";

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center overflow-hidden rounded-[15px] border border-white/10 bg-white/[.08] shadow-[0_14px_40px_rgba(54,68,173,.3)]">
        <img src="/logo.svg" alt="" className="h-7 w-auto max-w-8 object-contain" />
      </div>
      <div>
        <div className="text-[16px] font-bold tracking-[-.03em] text-white">Space Call</div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.18em] text-slate-400">
          Admin control center
        </div>
      </div>
    </div>
  );
}

function SecurityPoint({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-300">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
        <CheckCircle2 className="size-3" />
      </span>
      {children}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  label = "Password",
  autoComplete = "current-password",
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  label?: string;
  autoComplete?: string;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-slate-300">{label}</span>
      <div className="relative">
        <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEnter?.();
          }}
          className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[.065] pl-10 pr-11 text-[13px] text-white outline-none transition placeholder:text-slate-600 focus:border-[#7b86ff] focus:bg-white/[.09] focus:ring-4 focus:ring-[#6874f5]/10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const requestedMode =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("mode")
      : null;
  const recoveryMode = requestedMode === "recovery";
  const mfaMode = requestedMode === "mfa";
  const storedEmail =
    typeof window !== "undefined" ? window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "" : "";

  const [view, setView] = useState<LoginView>(recoveryMode || mfaMode ? "mfa" : "signin");
  const [email, setEmail] = useState(storedEmail);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(Boolean(storedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [privacyShielded, setPrivacyShielded] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetNonce, setCaptchaResetNonce] = useState(0);

  useEffect(() => {
    const shield = () => setPrivacyShielded(true);
    const unshield = () => setPrivacyShielded(false);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") shield();
      else unshield();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") {
        event.preventDefault();
        shield();
        window.setTimeout(unshield, 1200);
      }
    };

    window.addEventListener("blur", shield);
    window.addEventListener("focus", unshield);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pagehide", shield);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("blur", shield);
      window.removeEventListener("focus", unshield);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pagehide", shield);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (recoveryMode) return;

    let cancelled = false;
    getDashboardMfaStatus()
      .then((status) => {
        if (cancelled || !status) return;
        if (status.ready) {
          navigate("/dashboard");
          return;
        }
        setView("mfa");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [navigate, recoveryMode]);

  const handleCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaResetNonce((value) => value + 1);
  }, []);

  const title = useMemo(() => {
    if (view === "forgot") return "Reset your password";
    if (view === "recovery") return "Create a new password";
    if (view === "mfa") return "Secure verification";
    return "Welcome back";
  }, [view]);

  const description = useMemo(() => {
    if (view === "forgot") return "We’ll send a secure recovery link to your authorized dashboard email.";
    if (view === "recovery") return "Choose a strong new password for your Space Call admin account.";
    if (view === "mfa") return "Complete your authenticator verification before the admin workspace can open.";
    return "Sign in to manage products, orders, inventory and storefront content.";
  }, [view]);

  const submit = async () => {
    setInlineError("");
    if (!email.trim() || !password) {
      setInlineError("Enter your dashboard email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInDashboard(email, password, captchaToken ?? undefined);

      if (rememberEmail) window.localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
      else window.localStorage.removeItem(EMAIL_STORAGE_KEY);

      const mfaStatus = await getDashboardMfaStatus();
      if (!mfaStatus) throw new Error("Dashboard MFA status could not be verified.");

      if (mfaStatus.ready) {
        toast.success("Signed in securely.");
        navigate("/dashboard");
      } else {
        setPassword("");
        setView("mfa");
        window.history.replaceState({}, "", "/dashboard/login?mode=mfa");
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Sign in failed.";
      setInlineError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      resetCaptcha();
    }
  };

  const sendReset = async () => {
    setInlineError("");
    if (!email.trim()) {
      setInlineError("Enter your dashboard email first.");
      return;
    }

    setLoading(true);
    try {
      await requestDashboardPasswordReset(email, captchaToken ?? undefined);
      setResetSent(true);
      toast.success("Password recovery email sent.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Password reset request failed.";
      setInlineError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      resetCaptcha();
    }
  };

  const saveNewPassword = async () => {
    setInlineError("");
    if (newPassword.length < 10) {
      setInlineError("Use at least 10 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setInlineError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updateDashboardPassword(newPassword);
      window.history.replaceState({}, "", "/dashboard/login");
      setNewPassword("");
      setConfirmPassword("");
      setView("signin");
      toast.success("Password updated. Sign in with your new password.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Password update failed.";
      setInlineError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = () => {
    setInlineError("");
    setResetSent(false);
    resetCaptcha();
    setView("signin");
  };

  const handleMfaSuccess = useCallback(() => {
    toast.success("AAL2 security verified.");

    if (recoveryMode) {
      window.history.replaceState({}, "", "/dashboard/login?mode=recovery");
      setInlineError("");
      setView("recovery");
      return;
    }

    window.history.replaceState({}, "", "/dashboard/login");
    navigate("/dashboard");
  }, [navigate, recoveryMode]);

  const handleMfaCancel = useCallback(() => {
    window.history.replaceState({}, "", "/dashboard/login");
    setView("signin");
    setInlineError("");
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1224] text-white print:hidden">
      <style>{`
        @media print {
          html, body { background: #0a1224 !important; }
          body * { visibility: hidden !important; }
        }
      `}</style>
      {privacyShielded ? (
        <div
          className="fixed inset-0 z-[9999] grid place-items-center bg-[#081121]"
          aria-live="polite"
          data-testid="login-privacy-shield"
        >
          <div className="mx-auto max-w-xs px-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-[#aeb5ff]">
              <ShieldCheck className="size-6" />
            </div>
            <div className="mt-4 text-sm font-bold text-white">Sensitive content hidden</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
              Return to the login page to continue securely.
            </p>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 size-[430px] rounded-full bg-[#5667ff]/18 blur-[100px]" />
        <div className="absolute -bottom-36 -right-24 size-[520px] rounded-full bg-[#8d57d7]/16 blur-[120px]" />
        <div className="absolute left-1/2 top-[18%] h-px w-[78%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] items-start px-4 py-6 sm:items-center sm:px-6 sm:py-8 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#111c32]/88 shadow-[0_40px_120px_rgba(0,0,0,.38)] backdrop-blur-2xl lg:grid-cols-[1.05fr_.95fr]">
          <section className="relative hidden min-h-[640px] overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#17264b] via-[#121e37] to-[#10182d]" />
            <div className="absolute -right-28 top-10 size-80 rounded-full bg-[#6674ff]/18 blur-[90px]" />
            <div className="absolute -bottom-28 left-8 size-72 rounded-full bg-[#9153d5]/16 blur-[90px]" />

            <div className="relative">
              <BrandLockup />
            </div>

            <div className="relative max-w-md">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-indigo-200">
                <ShieldCheck className="size-3.5" />
                Secure admin access
              </div>
              <h2 className="max-w-[430px] text-[40px] font-black leading-[1.04] tracking-[-.055em] text-white xl:text-[46px]">
                Control your store from one focused workspace.
              </h2>
              <p className="mt-5 max-w-[430px] text-[13px] leading-6 text-slate-400">
                Manage catalog, stock, orders, customers and homepage content from the Space Call dashboard.
              </p>
              <div className="mt-8 space-y-3">
                <SecurityPoint>Supabase authentication with staff-role authorization</SecurityPoint>
                <SecurityPoint>Protected dashboard routes and server-side data rules</SecurityPoint>
                <SecurityPoint>Automatic sign-out after 30 minutes of inactivity</SecurityPoint>
                {isDashboardTurnstileConfigured ? <SecurityPoint>Cloudflare Turnstile bot protection</SecurityPoint> : null}
              </div>
            </div>

            <div className="relative flex items-center justify-between text-[10px] text-slate-500">
              <span>Space Call Admin</span>
              <a href="/" className="inline-flex items-center gap-1.5 font-semibold text-slate-300 transition hover:text-white">
                Open storefront <ArrowRight className="size-3" />
              </a>
            </div>
          </section>

          <section className="flex min-h-[620px] items-center justify-center p-5 sm:p-8 lg:min-h-[640px] lg:p-10 xl:p-12">
            <div className="w-full max-w-[430px]">
              <div className="mb-8 lg:hidden">
                <BrandLockup />
              </div>

              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-[#b5bdff]">
                  <LockKeyhole className="size-3.5" />
                  Authorized staff only
                </div>
                <h1 className="text-[32px] font-black tracking-[-.055em] text-white sm:text-[36px]">
                  {title}
                </h1>
                <p className="mt-2.5 max-w-md text-[13px] leading-5 text-slate-400">{description}</p>
              </div>

              {view === "signin" ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold text-slate-300">Email</span>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="username"
                        placeholder="name@company.com"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void submit();
                        }}
                        className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[.065] pl-10 pr-3 text-[13px] text-white outline-none transition placeholder:text-slate-600 focus:border-[#7b86ff] focus:bg-white/[.09] focus:ring-4 focus:ring-[#6874f5]/10"
                      />
                    </div>
                  </label>

                  <PasswordField
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    onEnter={() => void submit()}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] font-medium text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(event) => setRememberEmail(event.target.checked)}
                        className="size-3.5 rounded border-white/15 bg-white/5"
                      />
                      Remember email
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setInlineError("");
                        resetCaptcha();
                        setView("forgot");
                      }}
                      className="text-[10px] font-bold text-[#aeb5ff] transition hover:text-white"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <TurnstileChallenge
                    onTokenChange={handleCaptchaToken}
                    resetNonce={captchaResetNonce}
                  />

                  {inlineError ? (
                    <div role="alert" className="rounded-xl border border-rose-400/15 bg-rose-400/[.08] px-3.5 py-3 text-[11px] leading-5 text-rose-200">
                      {inlineError}
                    </div>
                  ) : null}

                  <button
                    onClick={() => void submit()}
                    disabled={loading || (isDashboardTurnstileConfigured && !captchaToken)}
                    className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#6271f6] to-[#785fe8] text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(103,113,245,.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Sign in to dashboard <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {view === "forgot" ? (
                <div className="space-y-4">
                  {resetSent ? (
                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.07] p-5">
                      <div className="grid size-10 place-items-center rounded-full bg-emerald-300/10 text-emerald-300">
                        <Mail className="size-4" />
                      </div>
                      <div className="mt-4 text-[14px] font-bold text-white">Check your inbox</div>
                      <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                        A secure recovery link was requested for <span className="font-semibold text-slate-200">{email}</span>.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold text-slate-300">Dashboard email</span>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                          <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            type="email"
                            autoComplete="email"
                            placeholder="name@company.com"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void sendReset();
                            }}
                            className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[.065] pl-10 pr-3 text-[13px] text-white outline-none transition placeholder:text-slate-600 focus:border-[#7b86ff] focus:ring-4 focus:ring-[#6874f5]/10"
                          />
                        </div>
                      </label>

                      <TurnstileChallenge
                        onTokenChange={handleCaptchaToken}
                        resetNonce={captchaResetNonce}
                      />

                      {inlineError ? (
                        <div role="alert" className="rounded-xl border border-rose-400/15 bg-rose-400/[.08] px-3.5 py-3 text-[11px] leading-5 text-rose-200">
                          {inlineError}
                        </div>
                      ) : null}

                      <button
                        onClick={() => void sendReset()}
                        disabled={loading || (isDashboardTurnstileConfigured && !captchaToken)}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#6271f6] to-[#785fe8] text-[12px] font-bold text-white disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <><Mail className="size-4" /> Send recovery link</>}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="flex h-10 w-full items-center justify-center gap-2 text-[11px] font-bold text-slate-400 transition hover:text-white"
                  >
                    <ArrowLeft className="size-3.5" /> Back to sign in
                  </button>
                </div>
              ) : null}

              {view === "recovery" ? (
                <div className="space-y-4">
                  <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((value) => !value)}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                    autoComplete="new-password"
                    onEnter={() => void saveNewPassword()}
                  />

                  <div className="rounded-xl border border-white/[.08] bg-white/[.035] px-3.5 py-3 text-[10px] leading-5 text-slate-400">
                    Use at least 10 characters. The password is screened against HIBP twice: first in your browser for fast feedback, then again by the protected password-update service before Supabase Auth accepts the change. HIBP receives only a 5-character hash prefix.
                  </div>

                  {inlineError ? (
                    <div role="alert" className="rounded-xl border border-rose-400/15 bg-rose-400/[.08] px-3.5 py-3 text-[11px] leading-5 text-rose-200">
                      {inlineError}
                    </div>
                  ) : null}

                  <button
                    onClick={() => void saveNewPassword()}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#6271f6] to-[#785fe8] text-[12px] font-bold text-white disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <><KeyRound className="size-4" /> Update password</>}
                  </button>
                </div>
              ) : null}

              {view === "mfa" ? (
                <DashboardMfaStep
                  onSuccess={handleMfaSuccess}
                  onCancel={handleMfaCancel}
                />
              ) : null}

              <div className="mt-8 border-t border-white/[.07] pt-5">
                <div className="flex items-center justify-center gap-2 text-[9px] font-medium text-slate-500">
                  <ShieldCheck className="size-3.5 text-emerald-400/70" />
                  Supabase Auth · staff role required · protected session
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
