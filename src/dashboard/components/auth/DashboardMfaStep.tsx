import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/dashboard/i18n";
import {
  beginDashboardTotpEnrollment,
  ensureDashboardMfaActivated,
  getDashboardMfaStatus,
  signOutDashboard,
  verifyDashboardTotp,
  type DashboardTotpEnrollment,
} from "@/dashboard/data/catalog";

type MfaMode = "loading" | "enroll" | "challenge";
type LoginTheme = "light" | "dark";

const mfaCopy = {
  en: {
    setupTitle: "Set up verification",
    verifyTitle: "Confirm your identity",
    setupDescription: "Scan the QR code with your authenticator app, then enter the current code.",
    verifyDescription: "Enter the current code from your authenticator app to continue.",
    badge: "Extra verification",
    preparing: "Preparing verification…",
    cannotScan: "Can't scan the QR? The setup key is hidden by default.",
    hideKey: "Hide setup key",
    revealKey: "Reveal setup key",
    copyKey: "Copy setup key",
    keyNotice: "The setup key hides automatically. Never share the QR code or setup key.",
    openApp: "Open authenticator app",
    codeLabel: "Verification code",
    enableContinue: "Enable and continue",
    verifyContinue: "Verify and continue",
    signOut: "Sign out",
    expired: "Verification expired. Sign in again to continue.",
    notReady: "Verification is not ready yet.",
    invalidCode: "Enter the numeric code from your authenticator app.",
    verified: "Identity verified.",
    failed: "The code could not be confirmed. Check the current code and try again.",
    tooMany: "Too many attempts. Wait a moment and try again.",
    unavailable: "Verification is temporarily unavailable. Try again shortly.",
    revealBeforeCopy: "Reveal the setup key before copying it.",
    copied: "Setup key copied and hidden again.",
    copyFailed: "Could not copy the setup key.",
    setupKeyLabel: "Authenticator setup key",
    qrAlt: "Authenticator setup QR code",
  },
  ar: {
    setupTitle: "إعداد التحقق",
    verifyTitle: "تأكيد الهوية",
    setupDescription: "امسح رمز QR بتطبيق المصادقة ثم أدخل الرمز الحالي.",
    verifyDescription: "أدخل الرمز الحالي من تطبيق المصادقة للمتابعة.",
    badge: "تحقق إضافي",
    preparing: "جارٍ تجهيز التحقق…",
    cannotScan: "تعذر مسح رمز QR؟ مفتاح الإعداد مخفي افتراضيًا.",
    hideKey: "إخفاء مفتاح الإعداد",
    revealKey: "إظهار مفتاح الإعداد",
    copyKey: "نسخ مفتاح الإعداد",
    keyNotice: "يُخفى مفتاح الإعداد تلقائيًا. لا تشارك رمز QR أو مفتاح الإعداد.",
    openApp: "فتح تطبيق المصادقة",
    codeLabel: "رمز التحقق",
    enableContinue: "تفعيل ومتابعة",
    verifyContinue: "تحقق ومتابعة",
    signOut: "تسجيل الخروج",
    expired: "انتهت مهلة التحقق. سجّل الدخول من جديد للمتابعة.",
    notReady: "التحقق غير جاهز بعد.",
    invalidCode: "أدخل الرمز الرقمي من تطبيق المصادقة.",
    verified: "تم تأكيد الهوية.",
    failed: "تعذر تأكيد الرمز. تحقق من الرمز الحالي وحاول مجددًا.",
    tooMany: "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.",
    unavailable: "التحقق غير متاح مؤقتًا. حاول بعد قليل.",
    revealBeforeCopy: "أظهر مفتاح الإعداد قبل نسخه.",
    copied: "تم نسخ مفتاح الإعداد وإخفاؤه مجددًا.",
    copyFailed: "تعذر نسخ مفتاح الإعداد.",
    setupKeyLabel: "مفتاح إعداد المصادقة",
    qrAlt: "رمز QR لإعداد المصادقة",
  },
} as const;

const MFA_CHALLENGE_WINDOW_MS = 5 * 60 * 1000;
const MFA_SECRET_REVEAL_MS = 15 * 1000;

function qrImageSource(value: string) {
  if (value.startsWith("data:")) return value;
  if (value.trim().startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
  }
  return value;
}

export default function DashboardMfaStep({
  onSuccess,
  onCancel,
  theme = "dark",
}: {
  onSuccess: () => void;
  onCancel: () => void;
  theme?: LoginTheme;
}) {
  const { lang } = useLanguage();
  const copy = mfaCopy[lang];
  const isRtl = lang === "ar";
  const [mode, setMode] = useState<MfaMode>("loading");
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<DashboardTotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState(
    () => Date.now() + MFA_CHALLENGE_WINDOW_MS,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.ceil(MFA_CHALLENGE_WINDOW_MS / 1000),
  );
  const [challengeExpired, setChallengeExpired] = useState(false);

  const initialize = useCallback(async () => {
    setError("");
    setMode("loading");

    try {
      const status = await getDashboardMfaStatus();
      if (!status) {
        await signOutDashboard().catch(() => undefined);
        onCancel();
        return;
      }

      if (!status.ready) {
        const authenticatedAt = status.authenticatedAt
          ? new Date(status.authenticatedAt).getTime()
          : Number.NaN;
        const deadline = authenticatedAt + MFA_CHALLENGE_WINDOW_MS;

        if (!Number.isFinite(authenticatedAt) || Date.now() >= deadline) {
          setCode("");
          setEnrollment(null);
          setSecretRevealed(false);
          await signOutDashboard().catch(() => undefined);
          onCancel();
          return;
        }

        setChallengeExpiresAt(deadline);
      }

      if (status.ready) {
        onSuccess();
        return;
      }

      if (status.currentLevel === "aal2" && status.verifiedFactorId) {
        await ensureDashboardMfaActivated();
        onSuccess();
        return;
      }

      if (status.verifiedFactorId) {
        setFactorId(status.verifiedFactorId);
        setEnrollment(null);
        setMode("challenge");
        return;
      }

      const nextEnrollment = await beginDashboardTotpEnrollment();
      setEnrollment(nextEnrollment);
      setFactorId(nextEnrollment.factorId);
      setMode("enroll");
    } catch {
      setError(copy.notReady);
      setMode("challenge");
    }
  }, [copy.notReady, onCancel, onSuccess]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((challengeExpiresAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        setChallengeExpired(true);
        setCode("");
        setEnrollment(null);
        setSecretRevealed(false);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [challengeExpiresAt]);

  useEffect(() => {
    if (!challengeExpired) return;

    let cancelled = false;
    void signOutDashboard()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) onCancel();
      });

    return () => {
      cancelled = true;
    };
  }, [challengeExpired, onCancel]);

  useEffect(() => {
    if (!secretRevealed) return;

    const timer = window.setTimeout(() => {
      setSecretRevealed(false);
    }, MFA_SECRET_REVEAL_MS);

    return () => window.clearTimeout(timer);
  }, [secretRevealed]);

  const verify = async () => {
    setError("");
    if (challengeExpired || remainingSeconds <= 0) {
      setError(copy.expired);
      return;
    }
    if (!factorId) {
      setError(copy.notReady);
      return;
    }

    const normalizedCode = code.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(normalizedCode)) {
      setError(copy.invalidCode);
      return;
    }

    setLoading(true);
    try {
      await verifyDashboardTotp(factorId, normalizedCode);
      toast.success(copy.verified);
      onSuccess();
    } catch (cause) {
      const safeMessage =
        cause instanceof Error &&
        cause.message === "Too many verification attempts. Wait a moment and try again."
          ? copy.tooMany
          : cause instanceof Error &&
              cause.message === "Verification service is temporarily unavailable. Try again shortly."
            ? copy.unavailable
            : copy.failed;
      setError(safeMessage);
      toast.error(safeMessage);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    setLoading(true);
    setCode("");
    setEnrollment(null);
    setSecretRevealed(false);
    await signOutDashboard().catch(() => undefined);
    setLoading(false);
    onCancel();
  };

  const copySecret = async () => {
    if (!enrollment?.secret || !secretRevealed) {
      toast.error(copy.revealBeforeCopy);
      return;
    }
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setSecretRevealed(false);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  const title = mode === "enroll" ? copy.setupTitle : copy.verifyTitle;
  const description =
    mode === "enroll" ? copy.setupDescription : copy.verifyDescription;

  const qrSource = useMemo(
    () => (enrollment?.qrCode ? qrImageSource(enrollment.qrCode) : ""),
    [enrollment?.qrCode],
  );

  if (mode === "loading") {
    return (
      <div className="grid min-h-[260px] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-[#8d96ff]" />
          <div className="login-muted mt-3 text-[11px] font-semibold text-slate-400">
            {copy.preparing}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-mfa-step" data-theme={theme}>
      <div className="mb-6">
        <div className="login-badge mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-emerald-200">
          <ShieldCheck className="size-3.5" />
          {copy.badge}
        </div>
        <h2 className="login-heading text-[28px] font-black tracking-[-.05em] text-white">{title}</h2>
        <p className="login-muted mt-2 text-[12px] leading-5 text-slate-400">{description}</p>
      </div>

      {mode === "enroll" && enrollment ? (
        <div className="login-soft mb-5 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <div className="mx-auto grid w-full max-w-[220px] place-items-center overflow-hidden rounded-2xl bg-white p-3">
            <img
              src={qrSource}
              alt={copy.qrAlt}
              className="aspect-square w-full object-contain"
              draggable={false}
            />
          </div>

          <div className="login-muted mt-4 text-center text-[10px] font-semibold text-slate-400">
            {copy.cannotScan}
          </div>
          <div className="login-secret mt-2 rounded-xl border border-white/10 bg-[#0b1427] p-2.5">
            <div className="flex items-center gap-2">
              <code
                className="login-heading min-w-0 flex-1 break-all text-[10px] font-semibold tracking-[.08em] text-slate-200"
                aria-label={copy.setupKeyLabel}
              >
                {secretRevealed ? enrollment.secret : "•••• •••• •••• ••••"}
              </code>
              <button
                type="button"
                onClick={() => setSecretRevealed((value) => !value)}
                className="login-icon-button grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.07] text-slate-300 hover:bg-white/10"
                aria-label={secretRevealed ? copy.hideKey : copy.revealKey}
              >
                {secretRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => void copySecret()}
                disabled={!secretRevealed}
                className="login-icon-button grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.07] text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={copy.copyKey}
              >
                <Copy className="size-3.5" />
              </button>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">
              {copy.keyNotice}
            </p>
          </div>

          {enrollment.uri.startsWith("otpauth://") ? (
            <a
              href={enrollment.uri}
              className="login-secondary mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-300/15 bg-indigo-300/[.07] text-[10px] font-bold text-indigo-200"
            >
              <Smartphone className="size-3.5" />
              {copy.openApp}
            </a>
          ) : null}
        </div>
      ) : null}

      <label className="block">
        <span className="login-label mb-2 block text-[11px] font-bold text-slate-300">
          {copy.codeLabel}
        </span>
        <div className="relative">
          <KeyRound className={isRtl ? "absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" : "absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"} />
          <input
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") void verify();
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={challengeExpired}
            placeholder="000000"
            aria-label={copy.codeLabel}
            className="login-input h-[54px] w-full rounded-[14px] border border-white/10 bg-white/[.065] px-10 text-center text-[18px] font-bold tracking-[.32em] text-white outline-none transition placeholder:text-slate-600 focus:border-[#7b86ff] focus:bg-white/[.09] focus:ring-4 focus:ring-[#6874f5]/10"
          />
        </div>
      </label>

      {error ? (
        <div
          role="alert"
          className="login-error mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.08] px-3.5 py-3 text-[11px] leading-5 text-rose-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void verify()}
        disabled={loading || challengeExpired}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#6271f6] to-[#785fe8] text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(103,113,245,.28)] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <ShieldCheck className="size-4" />
            {mode === "enroll" ? copy.enableContinue : copy.verifyContinue}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => void cancel()}
        disabled={loading}
        className="login-muted mt-2 flex h-10 w-full items-center justify-center gap-2 text-[10px] font-bold text-slate-500 transition hover:text-slate-300 disabled:opacity-50"
      >
        <LogOut className="size-3.5" />
        {copy.signOut}
      </button>
    </div>
  );
}
