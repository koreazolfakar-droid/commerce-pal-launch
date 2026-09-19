import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Loader2,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/dashboard/i18n";
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
type LoginTheme = "light" | "dark";

const EMAIL_STORAGE_KEY = "spacecall-dashboard-email";
const LOGIN_THEME_STORAGE_KEY = "spacecall-login-theme";

const loginCopy = {
  en: {
    brandSubtitle: "Admin workspace",
    privateWorkspace: "Private workspace",
    secureAccess: "Secure access",
    heroTitle: "A focused workspace for authorized staff.",
    heroBody: "Sign in with your approved account to continue.",
    protectedWorkspace: "Protected workspace",
    protectedBody: "Your sign-in details are hidden whenever this page loses focus.",
    openStorefront: "Open storefront",
    authorizedOnly: "Authorized access",
    welcome: "Welcome back",
    signInDescription: "Sign in to continue to your workspace.",
    forgotTitle: "Reset your password",
    forgotDescription: "Enter your account email to request a recovery link.",
    recoveryTitle: "Create a new password",
    recoveryDescription: "Choose a strong, unique password for your account.",
    mfaTitle: "Confirm your identity",
    mfaDescription: "Complete the additional verification to continue.",
    email: "Email",
    password: "Password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    rememberEmail: "Remember email",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    sendRecovery: "Send recovery link",
    updatePassword: "Update password",
    backToSignIn: "Back to sign in",
    recoveryReceived: "Recovery request received",
    recoveryBody: "If this email belongs to an authorized account, a recovery link will arrive shortly.",
    passwordHint: "Use at least 10 characters and avoid passwords you use on other services.",
    antiPhishing: "Never share your password or verification code. Space Call support will never ask for them.",
    sensitiveHidden: "Sensitive content hidden",
    returnSecurely: "Return to this page to continue.",
    capsLock: "Caps Lock is on. Check your password before continuing.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    switchLanguage: "العربية",
    required: "Enter your email and password.",
    emailRequired: "Enter your email first.",
    passwordShort: "Use at least 10 characters for your new password.",
    mismatch: "The two passwords do not match.",
    signedIn: "Signed in successfully.",
    resetRequested: "If this email is authorized, a recovery link will be sent.",
    passwordUpdated: "Password updated. Sign in with your new password.",
    verified: "Identity verified.",
    invalidEmail: "Enter a valid email address.",
    verificationRequired: "Complete the security check before continuing.",
    tooMany: "Too many attempts. Wait a moment and try again.",
    unavailable: "This service is temporarily unavailable. Try again shortly.",
    signInFailed: "Unable to sign in with those credentials.",
    resetFailed: "Password recovery could not be completed. Try again.",
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    brandSubtitle: "مساحة الإدارة",
    privateWorkspace: "مساحة خاصة",
    secureAccess: "دخول آمن",
    heroTitle: "مساحة عمل مركّزة للمستخدمين المصرّح لهم.",
    heroBody: "سجّل الدخول بحسابك المعتمد للمتابعة.",
    protectedWorkspace: "مساحة محمية",
    protectedBody: "يتم إخفاء بيانات تسجيل الدخول تلقائيًا عند مغادرة هذه الصفحة.",
    openStorefront: "فتح المتجر",
    authorizedOnly: "دخول للمصرّح لهم",
    welcome: "مرحبًا بعودتك",
    signInDescription: "سجّل الدخول للمتابعة إلى مساحة العمل.",
    forgotTitle: "استعادة كلمة المرور",
    forgotDescription: "أدخل بريد حسابك لطلب رابط الاستعادة.",
    recoveryTitle: "إنشاء كلمة مرور جديدة",
    recoveryDescription: "اختر كلمة مرور قوية وفريدة لحسابك.",
    mfaTitle: "تأكيد الهوية",
    mfaDescription: "أكمل خطوة التحقق الإضافية للمتابعة.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة",
    rememberEmail: "تذكر البريد",
    forgotPassword: "نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    sendRecovery: "إرسال رابط الاستعادة",
    updatePassword: "تحديث كلمة المرور",
    backToSignIn: "العودة لتسجيل الدخول",
    recoveryReceived: "تم استلام طلب الاستعادة",
    recoveryBody: "إذا كان البريد مرتبطًا بحساب مصرح له، سيصل رابط الاستعادة قريبًا.",
    passwordHint: "استخدم 10 أحرف على الأقل وتجنب كلمات المرور المستخدمة في خدمات أخرى.",
    antiPhishing: "لا تشارك كلمة المرور أو رمز التحقق. دعم Space Call لن يطلبهما منك.",
    sensitiveHidden: "تم إخفاء المحتوى الحساس",
    returnSecurely: "عد إلى هذه الصفحة للمتابعة.",
    capsLock: "زر الأحرف الكبيرة مفعّل. تحقق من كلمة المرور قبل المتابعة.",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    lightMode: "الوضع النهاري",
    darkMode: "الوضع الليلي",
    switchLanguage: "English",
    required: "أدخل البريد الإلكتروني وكلمة المرور.",
    emailRequired: "أدخل بريدك الإلكتروني أولًا.",
    passwordShort: "استخدم 10 أحرف على الأقل لكلمة المرور الجديدة.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    signedIn: "تم تسجيل الدخول بنجاح.",
    resetRequested: "إذا كان البريد مصرحًا له، سيتم إرسال رابط الاستعادة.",
    passwordUpdated: "تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.",
    verified: "تم تأكيد الهوية.",
    invalidEmail: "أدخل بريدًا إلكترونيًا صالحًا.",
    verificationRequired: "أكمل التحقق الأمني قبل المتابعة.",
    tooMany: "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.",
    unavailable: "الخدمة غير متاحة مؤقتًا. حاول بعد قليل.",
    signInFailed: "تعذر تسجيل الدخول بهذه البيانات.",
    resetFailed: "تعذر إكمال استعادة كلمة المرور. حاول مجددًا.",
    genericError: "حدث خطأ. حاول مجددًا.",
  },
} as const;

function BrandLockup() {
  const { lang } = useLanguage();
  const copy = loginCopy[lang];
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="login-logo-tile grid size-11 shrink-0 place-items-center overflow-hidden rounded-[15px] border border-white/10 bg-white/[.08] shadow-[0_14px_40px_rgba(54,68,173,.3)]">
        <img src="/logo.svg" alt="" className="h-7 w-auto max-w-8 object-contain" />
      </div>
      <div className="min-w-0">
        <div className="login-heading truncate text-[16px] font-bold tracking-[-.03em] text-white">
          Space Call
        </div>
        <div className="login-muted mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[.18em] text-slate-400">
          {copy.brandSubtitle}
        </div>
      </div>
    </div>
  );
}

function WorkspacePreview() {
  const { lang } = useLanguage();
  const copy = loginCopy[lang];
  return (
    <div className="login-soft relative overflow-hidden rounded-[24px] border border-white/[.08] bg-[#0d172b]/72 p-5 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/35 to-transparent" />
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-indigo-300/15 bg-indigo-300/[.08] text-indigo-200">
          <LockKeyhole className="size-5" />
        </div>
        <div>
          <div className="login-heading text-[13px] font-bold text-white">{copy.protectedWorkspace}</div>
          <div className="login-muted mt-1 text-[10px] leading-4 text-slate-400">{copy.protectedBody}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[1.25fr_.75fr] gap-2" aria-hidden="true">
        <div className="login-placeholder h-16 rounded-2xl bg-white/[.035]" />
        <div className="login-placeholder h-16 rounded-2xl bg-white/[.025]" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2" aria-hidden="true">
        <div className="login-placeholder h-10 rounded-xl bg-white/[.025]" />
        <div className="login-placeholder h-10 rounded-xl bg-white/[.04]" />
        <div className="login-placeholder h-10 rounded-xl bg-white/[.025]" />
      </div>
    </div>
  );
}

function ThemeLanguageControls({
  theme,
  onThemeToggle,
}: {
  theme: LoginTheme;
  onThemeToggle: () => void;
}) {
  const { lang, setLang } = useLanguage();
  const copy = loginCopy[lang];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "ar" : "en")}
        className="login-control flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-white/[.08] bg-white/[.04] px-2.5 text-slate-300 transition hover:bg-white/[.08] hover:text-white"
        aria-label={copy.switchLanguage}
        title={copy.switchLanguage}
      >
        <Languages className="size-4" />
        <span className="text-[10px] font-black">{lang === "en" ? "AR" : "EN"}</span>
      </button>
      <button
        type="button"
        onClick={onThemeToggle}
        className="login-control grid size-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.04] text-slate-300 transition hover:bg-white/[.08] hover:text-white"
        aria-label={theme === "dark" ? copy.lightMode : copy.darkMode}
        title={theme === "dark" ? copy.lightMode : copy.darkMode}
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  label,
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
  const { lang } = useLanguage();
  const copy = loginCopy[lang];
  const isRtl = lang === "ar";
  const [capsLockOn, setCapsLockOn] = useState(false);

  return (
    <label className="block">
      <span className="login-label mb-2 block text-[11px] font-bold text-slate-300">
        {label ?? copy.password}
      </span>
      <div className="relative">
        <KeyRound
          className={
            isRtl
              ? "absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              : "absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          }
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          dir={isRtl ? "rtl" : "ltr"}
          onKeyDown={(event) => {
            setCapsLockOn(event.getModifierState("CapsLock"));
            if (event.key === "Enter") onEnter?.();
          }}
          onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLockOn(false)}
          className="login-input h-[54px] w-full rounded-[16px] border border-white/[.09] bg-[#0a1426]/80 px-11 text-[16px] text-white shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[.14] focus:border-indigo-400/70 focus:bg-[#0c1830] focus:ring-4 focus:ring-indigo-500/10 sm:text-[13px]"
        />
        <button
          type="button"
          onClick={onToggle}
          className={
            isRtl
              ? "login-icon-button absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              : "login-icon-button absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          }
          aria-label={visible ? copy.hidePassword : copy.showPassword}
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
          {copy.capsLock}
        </div>
      ) : null}
    </label>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { lang, setLang } = useLanguage();
  const copy = loginCopy[lang];
  const isRtl = lang === "ar";
  const requestedMode =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("mode")
      : null;
  const recoveryMode = requestedMode === "recovery";
  const mfaMode = requestedMode === "mfa";
  const storedEmail =
    typeof window !== "undefined" ? window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "" : "";

  const [theme, setTheme] = useState<LoginTheme>(() => {
    if (typeof window === "undefined") return "dark";
    const storedTheme = window.localStorage.getItem(LOGIN_THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
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
    window.localStorage.setItem(LOGIN_THEME_STORAGE_KEY, theme);
  }, [theme]);

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

  const localizeAuthError = useCallback(
    (message: string) => {
      if (lang === "en") return message;
      const normalized = message.toLowerCase();
      if (normalized.includes("valid dashboard email") || normalized.includes("valid email")) {
        return copy.invalidEmail;
      }
      if (normalized.includes("security verification") || normalized.includes("captcha")) {
        return copy.verificationRequired;
      }
      if (normalized.includes("too many")) return copy.tooMany;
      if (normalized.includes("temporarily unavailable")) return copy.unavailable;
      if (normalized.includes("unable to sign in") || normalized.includes("sign in failed")) {
        return copy.signInFailed;
      }
      if (normalized.includes("password reset") || normalized.includes("recovery")) {
        return copy.resetFailed;
      }
      return copy.genericError;
    },
    [copy, lang],
  );

  const title = useMemo(() => {
    if (view === "forgot") return copy.forgotTitle;
    if (view === "recovery") return copy.recoveryTitle;
    if (view === "mfa") return copy.mfaTitle;
    return copy.welcome;
  }, [copy, view]);

  const description = useMemo(() => {
    if (view === "forgot") return copy.forgotDescription;
    if (view === "recovery") return copy.recoveryDescription;
    if (view === "mfa") return copy.mfaDescription;
    return copy.signInDescription;
  }, [copy, view]);

  const submit = async () => {
    setInlineError("");
    if (!email.trim() || !password) {
      setInlineError(copy.required);
      return;
    }

    setLoading(true);
    try {
      await signInDashboard(email, password, captchaToken ?? undefined);

      if (rememberEmail) window.localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
      else window.localStorage.removeItem(EMAIL_STORAGE_KEY);

      const mfaStatus = await getDashboardMfaStatus();
      if (!mfaStatus) throw new Error("Unable to verify this session.");

      if (mfaStatus.ready) {
        toast.success(copy.signedIn);
        navigate("/dashboard");
      } else {
        setPassword("");
        setView("mfa");
        window.history.replaceState({}, "", "/dashboard/login?mode=mfa");
      }
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : "Unable to sign in.";
      const message = localizeAuthError(rawMessage);
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
      setInlineError(copy.emailRequired);
      return;
    }

    setLoading(true);
    try {
      await requestDashboardPasswordReset(email, captchaToken ?? undefined);
      setResetSent(true);
      toast.success(copy.resetRequested);
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : "Password reset request failed.";
      const message = localizeAuthError(rawMessage);
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
      setInlineError(copy.passwordShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setInlineError(copy.mismatch);
      return;
    }

    setLoading(true);
    try {
      await updateDashboardPassword(newPassword);
      window.history.replaceState({}, "", "/dashboard/login");
      setNewPassword("");
      setConfirmPassword("");
      setView("signin");
      toast.success(copy.passwordUpdated);
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : "Password update failed.";
      const message = localizeAuthError(rawMessage);
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
    toast.success(copy.verified);

    if (recoveryMode) {
      window.history.replaceState({}, "", "/dashboard/login?mode=recovery");
      setInlineError("");
      setView("recovery");
      return;
    }

    window.history.replaceState({}, "", "/dashboard/login");
    navigate("/dashboard");
  }, [copy.verified, navigate, recoveryMode]);

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
    <div dir={isRtl ? "rtl" : "ltr"} data-login-theme={theme} className="login-root relative min-h-[100dvh] overflow-hidden bg-[#07101f] text-white print:hidden">
      <style>{`
        [data-login-theme="light"].login-root { background: #eef2f7 !important; color: #0f172a !important; }
        [data-login-theme="light"] .login-card { background: rgba(255,255,255,.96) !important; border-color: #e2e8f0 !important; box-shadow: 0 36px 110px rgba(15,23,42,.14) !important; }
        [data-login-theme="light"] .login-form-panel { background: #ffffff !important; }
        [data-login-theme="light"] .login-showcase { border-color: #e2e8f0 !important; }
        [data-login-theme="light"] .login-showcase-bg { background: radial-gradient(circle at 20% 10%, rgba(99,102,241,.14), transparent 34%), linear-gradient(145deg,#f8faff 0%,#f4f6ff 52%,#eef2ff 100%) !important; }
        [data-login-theme="light"] .login-heading { color: #0f172a !important; }
        [data-login-theme="light"] .login-muted { color: #64748b !important; }
        [data-login-theme="light"] .login-label { color: #334155 !important; }
        [data-login-theme="light"] .login-input { background: #f8fafc !important; border-color: #e2e8f0 !important; color: #0f172a !important; box-shadow: inset 0 1px 2px rgba(15,23,42,.03) !important; }
        [data-login-theme="light"] .login-input:focus { background: #fff !important; border-color: #818cf8 !important; }
        [data-login-theme="light"] .login-icon-button, [data-login-theme="light"] .login-control { color: #475569 !important; background: #fff !important; border-color: #e2e8f0 !important; }
        [data-login-theme="light"] .login-soft { background: rgba(255,255,255,.78) !important; border-color: #e0e7ff !important; box-shadow: 0 20px 60px rgba(79,70,229,.08) !important; }
        [data-login-theme="light"] .login-placeholder { background: #f1f5f9 !important; }
        [data-login-theme="light"] .login-footer { background: #f8fafc !important; border-color: #e2e8f0 !important; }
        [data-login-theme="light"] .login-privacy { background: rgba(238,242,247,.98) !important; }
        [data-login-theme="light"] .login-logo-tile { background: #fff !important; border-color: #e2e8f0 !important; box-shadow: 0 12px 32px rgba(30,41,59,.10) !important; }
        [data-login-theme="light"] .login-error { background: #fff1f2 !important; border-color: #fecdd3 !important; color: #be123c !important; }
        [data-login-theme="light"] .login-secret { background: #f8fafc !important; border-color: #e2e8f0 !important; color: #334155 !important; }
        [data-login-theme="light"] .login-secondary { background: #eef2ff !important; border-color: #e0e7ff !important; color: #4338ca !important; }
        [data-login-theme="light"] .login-badge { background: #ecfdf5 !important; border-color: #d1fae5 !important; color: #047857 !important; }
        [data-login-theme="light"] .login-accent { background: #eef2ff !important; border-color: #e0e7ff !important; color: #4338ca !important; }
        [data-login-theme="light"] .login-link { color: #4f46e5 !important; }
        @media print {
          html, body { background: #0a1224 !important; }
          body * { visibility: hidden !important; }
        }
      `}</style>
      {privacyShielded ? (
        <div
          className="login-privacy fixed inset-0 z-[9999] grid place-items-center bg-[#07101f]/98 backdrop-blur-xl"
          aria-live="polite"
          data-testid="login-privacy-shield"
        >
          <div className="mx-auto max-w-xs px-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-indigo-300/15 bg-indigo-300/[.07] text-[#c8ceff] shadow-[0_20px_60px_rgba(79,70,229,.18)]">
              <ShieldCheck className="size-6" />
            </div>
            <div className="login-heading mt-4 text-sm font-bold text-white">{copy.sensitiveHidden}</div>
            <p className="login-muted mt-1.5 text-[11px] leading-5 text-slate-400">
              {copy.returnSecurely}
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

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1180px] items-stretch p-0 sm:items-center sm:px-6 sm:py-8 lg:px-8">
        <div className="login-card grid min-h-[100dvh] w-full overflow-hidden bg-[#0c1629]/92 shadow-[0_40px_140px_rgba(0,0,0,.48)] backdrop-blur-2xl sm:min-h-0 sm:rounded-[32px] sm:border sm:border-white/[.08] sm:ring-1 sm:ring-white/[.02] lg:grid-cols-[1.05fr_.95fr]">
          <section className="login-showcase relative hidden min-h-[680px] overflow-hidden border-r border-white/[.07] p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="login-showcase-bg absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(79,70,229,.18),transparent_34%),linear-gradient(145deg,#111e38_0%,#0d172b_52%,#0a1426_100%)]" />
            <div className="absolute -right-24 top-24 size-72 rounded-full border border-white/[.035]" />
            <div className="absolute -right-8 top-40 size-48 rounded-full border border-white/[.03]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-300/20 to-transparent" />

            <div className="relative flex items-center justify-between">
              <BrandLockup />
              <div className="login-muted rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">
                {copy.privateWorkspace}
              </div>
            </div>

            <div className="relative my-10 max-w-[500px]">
              <div className="login-accent mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-indigo-200">
                <ShieldCheck className="size-3.5" />
                {copy.secureAccess}
              </div>
              <h2 className="login-heading max-w-[470px] text-[41px] font-black leading-[1.02] tracking-[-.055em] text-white xl:text-[48px]">
                {copy.heroTitle}
              </h2>
              <p className="login-muted mt-5 max-w-[455px] text-[13px] leading-6 text-slate-400">
                {copy.heroBody}
              </p>

              <div className="mt-7">
                <WorkspacePreview />
              </div>

            </div>

            <div className="relative flex items-center justify-between border-t border-white/[.06] pt-5 text-[9px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                Space Call Admin
              </span>
              <a href="/" className="login-link inline-flex items-center gap-1.5 font-semibold text-slate-300 transition hover:text-white">
                {copy.openStorefront} <ArrowRight className={isRtl ? "size-3 rotate-180" : "size-3"} />
              </a>
            </div>
          </section>

          <section className="login-form-panel relative flex min-h-[100dvh] items-start justify-center bg-[linear-gradient(180deg,rgba(255,255,255,.018),transparent_32%)] px-5 pb-8 pt-5 sm:min-h-[680px] sm:items-center sm:p-10 xl:p-12">
            <div className="w-full max-w-[420px]">
              <div className="mb-9 flex items-center justify-between gap-3 lg:hidden">
                <BrandLockup />
                <ThemeLanguageControls
                  theme={theme}
                  onThemeToggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                />
              </div>

              <div className={isRtl ? "absolute left-6 top-6 hidden lg:block" : "absolute right-6 top-6 hidden lg:block"}>
                <ThemeLanguageControls
                  theme={theme}
                  onThemeToggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                />
              </div>

              <div className="mb-8">
                <div className="login-accent mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[.065] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-[#c7ccff]">
                  <LockKeyhole className="size-3.5" />
                  {copy.authorizedOnly}
                </div>
                <h1 className="login-heading text-[34px] font-black leading-none tracking-[-.055em] text-white sm:text-[38px]">
                  {title}
                </h1>
                <p className="login-muted mt-3 max-w-md text-[12px] leading-5 text-slate-400">{description}</p>
              </div>

              {view === "signin" ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="login-label mb-2 block text-[11px] font-bold text-slate-300">{copy.email}</span>
                    <div className="relative">
                      <Mail className={isRtl ? "absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" : "absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"} />
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="username"
                        dir="ltr"
                        placeholder="name@company.com"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void submit();
                        }}
                        className="login-input h-[54px] w-full rounded-[16px] border border-white/[.09] bg-[#0a1426]/80 px-11 text-[16px] text-white shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[.14] focus:border-indigo-400/70 focus:bg-[#0c1830] focus:ring-4 focus:ring-indigo-500/10 sm:text-[13px]"
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
                    <label className="login-muted flex cursor-pointer items-center gap-2 text-[10px] font-medium text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(event) => setRememberEmail(event.target.checked)}
                        className="size-4 rounded border-white/15 bg-white/5 accent-indigo-500"
                      />
                      {copy.rememberEmail}
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
                      className="login-link rounded-md px-1 py-0.5 text-[10px] font-bold text-[#b9c0ff] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                    >
                      {copy.forgotPassword}
                    </button>
                  </div>

                  <TurnstileChallenge
                    onTokenChange={handleCaptchaToken}
                    resetNonce={captchaResetNonce}
                  />

                  {inlineError ? (
                    <div role="alert" className="login-error rounded-[14px] border border-rose-300/15 bg-rose-400/[.07] px-3.5 py-3 text-[11px] leading-5 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,.06)]">
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
                        {copy.signIn} <ArrowRight className={isRtl ? "size-4 rotate-180" : "size-4"} />
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
                      <div className="login-heading mt-4 text-[14px] font-bold text-white">{copy.recoveryReceived}</div>
                      <p className="login-muted mt-1.5 text-[11px] leading-5 text-slate-400">
                        {copy.recoveryBody}
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="block">
                        <span className="login-label mb-2 block text-[11px] font-bold text-slate-300">{copy.email}</span>
                        <div className="relative">
                          <Mail className={isRtl ? "absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" : "absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"} />
                          <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            type="email"
                            inputMode="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            autoComplete="email"
                            dir="ltr"
                            placeholder="name@company.com"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void sendReset();
                            }}
                            className="login-input h-[54px] w-full rounded-[16px] border border-white/[.09] bg-[#0a1426]/80 px-11 text-[16px] text-white shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[.14] focus:border-indigo-400/70 focus:bg-[#0c1830] focus:ring-4 focus:ring-indigo-500/10 sm:text-[13px]"
                          />
                        </div>
                      </label>

                      <TurnstileChallenge
                        onTokenChange={handleCaptchaToken}
                        resetNonce={captchaResetNonce}
                      />

                      {inlineError ? (
                        <div role="alert" className="login-error rounded-[14px] border border-rose-300/15 bg-rose-400/[.07] px-3.5 py-3 text-[11px] leading-5 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,.06)]">
                          {inlineError}
                        </div>
                      ) : null}

                      <button
                        onClick={() => void sendReset()}
                        disabled={loading || (isDashboardTurnstileConfigured && !captchaToken)}
                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-indigo-300/10 bg-gradient-to-r from-[#6472f3] to-[#765ee7] text-[12px] font-bold text-white shadow-[0_16px_34px_rgba(87,84,219,.24)] transition hover:brightness-110 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <><Mail className="size-4" /> {copy.sendRecovery}</>}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="login-muted flex h-10 w-full items-center justify-center gap-2 text-[11px] font-bold text-slate-400 transition hover:text-white"
                  >
                    <ArrowLeft className={isRtl ? "size-3.5 rotate-180" : "size-3.5"} /> {copy.backToSignIn}
                  </button>
                </div>
              ) : null}

              {view === "recovery" ? (
                <div className="space-y-4">
                  <PasswordField
                    label={copy.newPassword}
                    value={newPassword}
                    onChange={setNewPassword}
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((value) => !value)}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    label={copy.confirmPassword}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                    autoComplete="new-password"
                    onEnter={() => void saveNewPassword()}
                  />

                  <div className="login-soft login-muted rounded-xl border border-white/[.08] bg-white/[.035] px-3.5 py-3 text-[10px] leading-5 text-slate-400">
                    {copy.passwordHint}
                  </div>

                  {inlineError ? (
                    <div role="alert" className="login-error rounded-[14px] border border-rose-300/15 bg-rose-400/[.07] px-3.5 py-3 text-[11px] leading-5 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,.06)]">
                      {inlineError}
                    </div>
                  ) : null}

                  <button
                    onClick={() => void saveNewPassword()}
                    disabled={loading}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-indigo-300/10 bg-gradient-to-r from-[#6472f3] to-[#765ee7] text-[12px] font-bold text-white shadow-[0_16px_34px_rgba(87,84,219,.24)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <><KeyRound className="size-4" /> {copy.updatePassword}</>}
                  </button>
                </div>
              ) : null}

              {view === "mfa" ? (
                <DashboardMfaStep
                  onSuccess={handleMfaSuccess}
                  onCancel={handleMfaCancel}
                  theme={theme}
                />
              ) : null}

              <div className="login-footer mt-8 rounded-[16px] border border-white/[.055] bg-white/[.025] px-4 py-3.5">
                <p className="login-muted text-center text-[9px] leading-4 text-slate-500">
                  {copy.antiPhishing}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
