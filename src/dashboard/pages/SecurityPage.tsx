import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  getDashboardSecuritySnapshot,
  signOutAllDashboardSessions,
  signOutDashboard,
  signOutOtherDashboardSessions,
  type DashboardSecurityEvent,
  type DashboardSecuritySnapshot,
} from "@/dashboard/data/catalog";

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    login_success: "Secure login",
    mfa_verified: "Authenticator verified",
    mfa_enabled: "MFA enabled",
    password_changed: "Password changed",
    signout_local: "Current session signed out",
    signout_others: "Other sessions revoked",
    signout_global: "All sessions revoked",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}

function deviceLabel(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const platform =
    ua.includes("android") ? "Android" :
    ua.includes("iphone") || ua.includes("ipad") ? "iOS / iPadOS" :
    ua.includes("windows") ? "Windows" :
    ua.includes("mac os") || ua.includes("macintosh") ? "macOS" :
    ua.includes("linux") ? "Linux" :
    "Unknown device";

  const browser =
    ua.includes("edg/") ? "Edge" :
    ua.includes("chrome/") ? "Chrome" :
    ua.includes("firefox/") ? "Firefox" :
    ua.includes("safari/") ? "Safari" :
    "Browser";

  return `${platform} · ${browser}`;
}

function SecurityEventRow({ event }: { event: DashboardSecurityEvent }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <ShieldCheck className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold text-slate-700">{eventLabel(event.eventType)}</div>
        <div className="mt-1 text-[10px] text-slate-400">
          {new Date(event.createdAt).toLocaleString()} · {deviceLabel(event.userAgent)}
        </div>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [, navigate] = useLocation();
  const [snapshot, setSnapshot] = useState<DashboardSecuritySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"local" | "others" | "global" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await getDashboardSecuritySnapshot());
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load security center.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sessionExpiry = useMemo(() => {
    if (!snapshot?.expiresAt) return "Unavailable";
    const expires = new Date(snapshot.expiresAt);
    return Number.isNaN(expires.getTime()) ? "Unavailable" : expires.toLocaleString();
  }, [snapshot?.expiresAt]);

  const signOutCurrent = async () => {
    setAction("local");
    try {
      await signOutDashboard();
      navigate("/dashboard/login");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Sign out failed.");
    } finally {
      setAction(null);
    }
  };

  const signOutOthers = async () => {
    if (!window.confirm("Sign out every other Space Call dashboard session and keep this device signed in?")) return;
    setAction("others");
    try {
      await signOutOtherDashboardSessions();
      toast.success("All other sessions were revoked.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not revoke other sessions.");
    } finally {
      setAction(null);
    }
  };

  const signOutAll = async () => {
    if (!window.confirm("Sign out every Space Call dashboard session on every device?")) return;
    setAction("global");
    try {
      await signOutAllDashboardSessions();
      navigate("/dashboard/login");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not revoke all sessions.");
    } finally {
      setAction(null);
    }
  };

  if (loading && !snapshot) {
    return <div className="grid min-h-[460px] place-items-center"><Loader2 className="size-6 animate-spin text-[#5968ea]" /></div>;
  }

  if (!snapshot) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Security information is unavailable for this session.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">System / Security</div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Security Center</h1>
          <p className="mt-1.5 text-sm text-slate-500">MFA, bot protection, session controls and security activity in one place.</p>
        </div>
        <button onClick={() => void load()} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-500">MFA protection</div>
            <CheckCircle2 className="size-5 text-emerald-500" />
          </div>
          <div className="mt-3 text-xl font-bold text-[#14203a]">{snapshot.mfaRequired && snapshot.currentLevel === "aal2" ? "AAL2 active" : "Attention required"}</div>
          <div className="mt-1 text-[10px] text-slate-400">{snapshot.mfaEnrolledAt ? `Enrolled ${new Date(snapshot.mfaEnrolledAt).toLocaleDateString()}` : "Authenticator enrollment incomplete"}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-500">Bot protection</div>
            {snapshot.turnstileConfigured ? <CheckCircle2 className="size-5 text-emerald-500" /> : <AlertTriangle className="size-5 text-amber-500" />}
          </div>
          <div className="mt-3 text-xl font-bold text-[#14203a]">{snapshot.turnstileConfigured ? "Turnstile ready" : "Not configured"}</div>
          <div className="mt-1 text-[10px] text-slate-400">Cloudflare challenge token is sent directly to Supabase Auth.</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-500">Current session</div>
            <Laptop className="size-5 text-indigo-500" />
          </div>
          <div className="mt-3 truncate text-[13px] font-bold text-[#14203a]">{snapshot.email}</div>
          <div className="mt-1 text-[10px] text-slate-400">Access token expiry: {sessionExpiry}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="text-[13px] font-bold text-[#14203a]">Session controls</div>
            <div className="mt-1 text-[10px] text-slate-400">Revoke refresh sessions without exposing session tokens to the UI.</div>
          </div>
          <div className="space-y-3 p-5">
            <button onClick={() => void signOutCurrent()} disabled={action !== null} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 disabled:opacity-50">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Smartphone className="size-4" /></div>
              <div className="flex-1"><div className="text-[12px] font-bold text-slate-700">Sign out this device</div><div className="mt-1 text-[10px] text-slate-400">Only end the current browser session.</div></div>
              {action === "local" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4 text-slate-400" />}
            </button>

            <button onClick={() => void signOutOthers()} disabled={action !== null} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-amber-200 hover:bg-amber-50/30 disabled:opacity-50">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><KeyRound className="size-4" /></div>
              <div className="flex-1"><div className="text-[12px] font-bold text-slate-700">Sign out all other sessions</div><div className="mt-1 text-[10px] text-slate-400">Keep this device, revoke refresh tokens elsewhere.</div></div>
              {action === "others" ? <Loader2 className="size-4 animate-spin" /> : null}
            </button>

            <button onClick={() => void signOutAll()} disabled={action !== null} className="flex w-full items-center gap-3 rounded-xl border border-rose-200 p-4 text-left transition hover:bg-rose-50/40 disabled:opacity-50">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><ShieldCheck className="size-4" /></div>
              <div className="flex-1"><div className="text-[12px] font-bold text-rose-700">Sign out all sessions</div><div className="mt-1 text-[10px] text-rose-400">Revoke refresh sessions on every device, including this one.</div></div>
              {action === "global" ? <Loader2 className="size-4 animate-spin text-rose-500" /> : null}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="text-[13px] font-bold text-[#14203a]">Recent security activity</div>
            <div className="mt-1 text-[10px] text-slate-400">Only authenticated Space Call dashboard security events are shown.</div>
          </div>
          {snapshot.events.length ? (
            <div>{snapshot.events.map((event) => <SecurityEventRow key={event.id} event={event} />)}</div>
          ) : (
            <div className="px-5 py-12 text-center text-[11px] text-slate-400">No security events recorded yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
