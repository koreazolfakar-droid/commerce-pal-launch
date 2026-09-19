import {
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  beginDashboardTotpEnrollment,
  getDashboardMfaStatus,
  signOutDashboard,
  verifyDashboardTotp,
  type DashboardTotpEnrollment,
} from "@/dashboard/data/catalog";

type MfaMode = "loading" | "enroll" | "challenge";

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
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<MfaMode>("loading");
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<DashboardTotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialize = useCallback(async () => {
    setError("");
    setMode("loading");

    try {
      const status = await getDashboardMfaStatus();
      if (!status) throw new Error("Your dashboard session has expired.");

      if (status.ready) {
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
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to prepare multi-factor authentication.";
      setError(message);
      setMode("challenge");
    }
  }, [onSuccess]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const verify = async () => {
    setError("");
    if (!factorId) {
      setError("Authenticator setup is not ready yet.");
      return;
    }

    const normalizedCode = code.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(normalizedCode)) {
      setError("Enter the numeric code from your authenticator app.");
      return;
    }

    setLoading(true);
    try {
      await verifyDashboardTotp(factorId, normalizedCode);
      toast.success("Multi-factor authentication verified.");
      onSuccess();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Authenticator verification failed.";
      setError(message);
      toast.error(message);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    setLoading(true);
    await signOutDashboard().catch(() => undefined);
    setLoading(false);
    onCancel();
  };

  const copySecret = async () => {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      toast.success("Authenticator secret copied.");
    } catch {
      toast.error("Could not copy the authenticator secret.");
    }
  };

  const title = mode === "enroll" ? "Protect your admin account" : "Two-factor verification";
  const description =
    mode === "enroll"
      ? "Scan the QR code with Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app."
      : "Enter the current code from your authenticator app to continue.";

  const qrSource = useMemo(
    () => (enrollment?.qrCode ? qrImageSource(enrollment.qrCode) : ""),
    [enrollment?.qrCode],
  );

  if (mode === "loading") {
    return (
      <div className="grid min-h-[260px] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-[#8d96ff]" />
          <div className="mt-3 text-[11px] font-semibold text-slate-400">
            Preparing secure authentication…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-mfa-step">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-emerald-200">
          <ShieldCheck className="size-3.5" />
          TOTP · AAL2 required
        </div>
        <h2 className="text-[28px] font-black tracking-[-.05em] text-white">{title}</h2>
        <p className="mt-2 text-[12px] leading-5 text-slate-400">{description}</p>
      </div>

      {mode === "enroll" && enrollment ? (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <div className="mx-auto grid w-full max-w-[220px] place-items-center overflow-hidden rounded-2xl bg-white p-3">
            <img
              src={qrSource}
              alt="Space Call authenticator QR code"
              className="aspect-square w-full object-contain"
              draggable={false}
            />
          </div>

          <div className="mt-4 text-center text-[10px] font-semibold text-slate-400">
            Can't scan the QR?
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1427] p-2.5">
            <code className="min-w-0 flex-1 break-all text-[10px] font-semibold tracking-[.08em] text-slate-200">
              {enrollment.secret}
            </code>
            <button
              type="button"
              onClick={() => void copySecret()}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.07] text-slate-300 hover:bg-white/10"
              aria-label="Copy authenticator secret"
            >
              <Copy className="size-3.5" />
            </button>
          </div>

          {enrollment.uri.startsWith("otpauth://") ? (
            <a
              href={enrollment.uri}
              className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-300/15 bg-indigo-300/[.07] text-[10px] font-bold text-indigo-200"
            >
              <Smartphone className="size-3.5" />
              Open authenticator app
            </a>
          ) : null}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-[11px] font-bold text-slate-300">
          Authenticator code
        </span>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
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
            placeholder="000000"
            aria-label="Authenticator code"
            className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[.065] pl-10 pr-3 text-center text-[18px] font-bold tracking-[.32em] text-white outline-none transition placeholder:text-slate-600 focus:border-[#7b86ff] focus:bg-white/[.09] focus:ring-4 focus:ring-[#6874f5]/10"
          />
        </div>
      </label>

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.08] px-3.5 py-3 text-[11px] leading-5 text-rose-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void verify()}
        disabled={loading}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#6271f6] to-[#785fe8] text-[12px] font-bold text-white shadow-[0_12px_30px_rgba(103,113,245,.28)] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <ShieldCheck className="size-4" />
            {mode === "enroll" ? "Enable MFA and continue" : "Verify and continue"}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => void cancel()}
        disabled={loading}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 text-[10px] font-bold text-slate-500 transition hover:text-slate-300 disabled:opacity-50"
      >
        <LogOut className="size-3.5" />
        Sign out
      </button>
    </div>
  );
}
