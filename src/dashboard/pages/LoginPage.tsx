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
      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-emerald-300/15 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,.08)]">
        <CheckCircle2 className="size-3" />
      </span>
      {children}
    </div>
  );
}

function WorkspacePreview() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[.08] bg-[#0d172b]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/35 to-transparent" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">
            Workspace status
          </div>
          <div className="mt-1 text-[14px] font-bold tracking-[-.03em] text-white">
            Space Call Operations
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-2.5 py-1 text-[9px] font-bold text-emerald-200">
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]" />
          Protected
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Catalog", "Live"],
          ["Inventory", "Synced"],
          ["Security", "AAL2"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[.07] bg-white/[.035] px-3 py-3"
          >
            <div className="text-[8px] font-semibold uppercase tracking-[.13em] text-slate-500">
              {label}
            </div>
            <div className="mt-1.5 text-[12px] font-bold text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-3">
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span>Secure access chain</span>
          <span className="font-semibold text-slate-300">3 layers</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-indigo-400/90" />
          <div className="h-1.5 flex-1 rounded-full bg-violet-400/75" />
          <div className="h-1.5 flex-1 rounded-full bg-emerald-400/80" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[8px] font-semibold text-slate-500">
          <span>Identity</span>
          <span className="text-center">MFA</span>
          <span className="text-right">Role access</span>
        </div>
      </div>
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
  const [capsLockOn, setCapsLockOn] = useState(false);

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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(event) => {
            setCapsLockOn(event.getModifierState("CapsLock"));
            if (event.key === "Enter") onEnter?.();
          }}
          onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLockOn(false)}
          className="h-[52px] w-full rounded-[16px] border border-white/[.09] bg-[#0a1426]/80 pl-10 pr-11 text-[13px] text-white shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[.14] focus:border-indigo-400/70 focus:bg-[#0c1830] focus:ring-4 focus:ring-indigo-500/10"
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
      {capsLockOn ? (
        <div
          role="status"
          className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-amber-200"
        >
          <ShieldCheck className="size-3.5" />
          Caps Lock is on. Check your password before continuing.
        </div>
      ) : null}
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
      const message = cause instanceof Error ? cause.message : "Unable to sign in.";
      setPassword("");
      setShowPassword(false);
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
      toast.success("If this email is authorized, a recovery link will be sent.");
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
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setView("signin");
    setInlineError("");
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07101f] text-white print:hidden">
      <style>{`
        @media print {
          html, body { background: #0a1224 !important; }
          body * { visibility: hidden !important; }
        }
      `}</style>
      {privacyShielded ? (
        <div
          className="fixed inset-0 z-[9999] grid place-items-center bg-[#07101f]/98 backdrop-blur-xl"
          aria-live="polite"
          data-testid="login-privacy-shield"
        >
          <div className="mx-auto max-w-xs px-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-indigo-300/15 bg-indigo-300/[.07] text-[#c8ceff] shadow-[0_20px_60px_rgba(79,70,229,.18)]">
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
        <div className="absolute -left-36 -top-44 size-[560px] rounded-full bg-indigo-500/[.16] blur-[120px]" />
        <div className="absolute -bottom-48 -right-24 size-[620px] rounded-full bg-violet-500/[.12] blur-[140px]" />
        <div className="absolute left-[58%] top-[12%] size-[260px] rounded-full bg-cyan-400/[.035] blur-[90px]" />
        <div className="absolute inset-0 opacity-[.028] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[.025] to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] items-start px-3 py-3 sm:items-center sm:px-6 sm:py-8 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/[.08] bg-[#0c1629]/92 shadow-[0_40px_140px_rgba(0,0,0,.48)] ring-1 ring-white/[.02] backdrop-blur-2xl sm:rounded-[32px] lg:grid-cols-[1.05fr_.95fr]">
          <section className="relative hidden min-h-[680px] overflow-hidden border-r border-white/[.07] p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(79,70,229,.18),transparent_34%),linear-gradient(145deg,#111e38_0%,#0d172b_52%,#0a1426_100%)]" />
            <div className="absolute -right-24 top-24 size-72 rounded-full border border-white/[.035]" />
            <div className="absolute -right-8 top-40 size-48 rounded-full border border-white/[.03]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-300/20 to-transparent" />

            <div className="relative flex items-center justify-between">
              <BrandLockup />
              <div className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">
                Private workspace
              </div>
            </div>

            <div className="relative my-10 max-w-[500px]">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-indigo-200">
                <ShieldCheck className="size-3.5" />
                Secure admin access
              </div>
              <h2 className="max-w-[470px] text-[41px] font-black leading-[1.02] tracking-[-.055em] text-white xl:text-[48px]">
                Your store operations,
                <span className="block bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  one secure workspace.
                </span>
              </h2>
              <p className="mt-5 max-w-[455px] text-[13px] leading-6 text-slate-400">
                Manage catalog, stock, orders, customers and storefront content with role-aware access and protected sessions.
              </p>

              <div className="mt-7">
                <WorkspacePreview />
              </div>

              <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3">
                <SecurityPoint>Supabase authentication with staff-role authorization</SecurityPoint>
                <SecurityPoint>Protected dashboard routes and server-side data rules</SecurityPoint>
                <SecurityPoint>Automatic sign-out after 30 minutes of inactivity</SecurityPoint>
                {isDashboardTurnstileConfigured ? <SecurityPoint>Cloudflare Turnstile bot protection</SecurityPoint> : <SecurityPoint>Multi-factor access enforcement</SecurityPoint>}
              </div>
            </div>

            <div className="relative flex items-center justify-between border-t border-white/[.06] pt-5 text-[9px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                Space Call Admin
              </span>
              <a href="/" className="inline-flex items-center gap-1.5 font-semibold text-slate-300 transition hover:text-white">
                Open storefront <ArrowRight className="size-3" />
              </a>
            </div>
          </section>

          <section className="relative flex min-h-[640px] items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,.018),transparent_32%)] p-5 sm:p-8 lg:min-h-[680px] lg:p-10 xl:p-12">
            <div className="w-full max-w-[420px]">
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <BrandLockup />
                <a href="/" className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[9px] font-bold text-slate-400">
                  Storefront
                </a>
              </div>

              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[.065] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-[#c7ccff]">
                  <LockKeyhole className="size-3.5" />
                  Authorized staff only
                </div>
                <h1 className="text-[34px] font-black leading-none tracking-[-.055em] text-white sm:text-[38px]">
                  {title}
                </h1>
                <p className="mt-3 max-w-md text-[12px] leading-5 text-slate-400">{description}</p>
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
                        spellCheck={false}
                        autoComplete="username"
                        placeholder="name@company.com"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void submit();
                        }}
                        className="h-[52px] w-full rounded-[16px] border border-white/[.09] bg-[#0a1426]/80 pl-10 pr-3 text-[13px] text-white shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[.14] focus:border-indigo-400/70 focus:bg-[#0c1830] focus:ring-4 focus:ring-indigo-500/10"
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
                        className="size-4 rounded border-white/15 bg-white/5 accent-indigo-500"
                      />
                      Remember email
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setInlineError("");
                        setPassword("");
                        setShowPassword(false);
                        resetCaptcha();
                        setView("forgot");
                      }}
                      className="rounded-md px-1 py-0.5 text-[10px] font-bold text-[#b9c0ff] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <TurnstileChallenge
                    onTokenChange={handleCaptchaToken}
                    resetNonce={captchaResetNonce}
                  />

                  {inlineError ? (
                    <div role="alert" className="rounded-[14px] border border-rose-300/15 bg-rose-400/[.07] px-3.5 py-3 text-[11px] leading-5 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,.06)]">
                      {inlineError}
                    </div>
                  ) : null}

                  <button
                    onClick={() => void submit()}
                    disabled={loading || (isDashboardTurnstileConfigured && !captchaToken)}
                    className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-indigo-300/10 bg-gradient-to-r from-[#6472f3] via-[#6d68ef] to-[#765ee7] text-[12px] font-bold text-white shadow-[0_18px_38px_rgba(87,84,219,.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_44px_rgba(87,84,219,.34)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
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
                    <div className="rounded-[20px] border border-emerald-300/15 bg-emerald-300/[.055] p-5 shadow-[0_18px_50px_rgba(16,185,129,.06)]">
                      <div className="grid size-10 place-items-center rounded-full bg-emerald-300/10 text-emerald-300">
                        <Mail className="size-4" />
                      </div>
                      <div className="mt-4 text-[14px] font-bold text-white">Recovery request received</div>
                      <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                        If <span className="font-semibold text-slate-200">{email}</span> belongs to an authorized dashboard account, a secure recovery link will arrive shortly.
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
                            inputMode="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            autoComplete="email"
                            placeholder="name@company.com"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void sendReset();
                            }}
                            className="h-[52px] w-full rounded-[16px] border border-white/[.09] bg-[#0a1426]/80 pl-10 pr-3 text-[13px] text-white shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[.14] focus:border-indigo-400/70 focus:bg-[#0c1830] focus:ring-4 focus:ring-indigo-500/10"
                          />
                        </div>
                      </label>

                      <TurnstileChallenge
                        onTokenChange={handleCaptchaToken}
                        resetNonce={captchaResetNonce}
                      />

                      {inlineError ? (
                        <div role="alert" className="rounded-[14px] border border-rose-300/15 bg-rose-400/[.07] px-3.5 py-3 text-[11px] leading-5 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,.06)]">
                          {inlineError}
                        </div>
                      ) : null}

                      <button
                        onClick={() => void sendReset()}
                        disabled={loading || (isDashboardTurnstileConfigured && !captchaToken)}
                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-indigo-300/10 bg-gradient-to-r from-[#6472f3] to-[#765ee7] text-[12px] font-bold text-white shadow-[0_16px_34px_rgba(87,84,219,.24)] transition hover:brightness-110 disabled:opacity-50"
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
                    <div role="alert" className="rounded-[14px] border border-rose-300/15 bg-rose-400/[.07] px-3.5 py-3 text-[11px] leading-5 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,.06)]">
                      {inlineError}
                    </div>
                  ) : null}

                  <button
                    onClick={() => void saveNewPassword()}
                    disabled={loading}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-indigo-300/10 bg-gradient-to-r from-[#6472f3] to-[#765ee7] text-[12px] font-bold text-white shadow-[0_16px_34px_rgba(87,84,219,.24)] transition hover:brightness-110 disabled:opacity-50"
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

              <div className="mt-8 rounded-[16px] border border-white/[.055] bg-white/[.025] px-4 py-3.5">
                <div className="flex items-center justify-center gap-2 text-[9px] font-semibold text-slate-400">
                  <ShieldCheck className="size-3.5 text-emerald-400/80" />
                  Supabase Auth · staff role required · protected session
                </div>
                <p className="mt-1.5 text-center text-[9px] leading-4 text-slate-600">
                  Never share your password or authenticator code. Space Call support will never ask for them.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
