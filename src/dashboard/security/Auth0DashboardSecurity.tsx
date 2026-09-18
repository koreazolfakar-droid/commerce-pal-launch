import { createContext, useContext, type ReactNode } from "react";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

type DashboardAuth0ContextValue = {
  enabled: boolean;
  logoutAuth0: () => Promise<void>;
};

const DashboardAuth0Context = createContext<DashboardAuth0ContextValue>({
  enabled: false,
  logoutAuth0: async () => undefined,
});

export function useDashboardAuth0() {
  return useContext(DashboardAuth0Context);
}

const domain = (import.meta.env.VITE_AUTH0_DOMAIN as string | undefined)?.trim();
const clientId = (import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined)?.trim();

export const isDashboardAuth0Configured = Boolean(domain && clientId);

function Auth0Gate({ children }: { children: ReactNode }) {
  const {
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();

  const logoutAuth0 = async () => {
    await logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#101b32]">
        <div className="text-center text-white">
          <Loader2 className="mx-auto size-6 animate-spin text-[#8d96ff]" />
          <div className="mt-3 text-[11px] font-semibold text-slate-400">
            Verifying Auth0 security session…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#101b32] p-5">
        <div className="w-full max-w-md rounded-3xl border border-rose-400/20 bg-white/[.07] p-7 text-center text-white shadow-2xl backdrop-blur-xl">
          <LockKeyhole className="mx-auto size-8 text-rose-300" />
          <h1 className="mt-4 text-xl font-bold">Auth0 verification failed</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {error.message || "The dashboard security session could not be verified."}
          </p>
          <button
            type="button"
            onClick={() =>
              void loginWithRedirect({
                appState: { returnTo: window.location.pathname || "/dashboard" },
                authorizationParams: { prompt: "login" },
              })
            }
            className="mt-5 h-11 rounded-xl bg-[#6874f5] px-5 text-[12px] font-bold text-white"
          >
            Try secure sign in again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#101b32] p-5">
        <div className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[.07] p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="absolute -left-16 -top-16 size-52 rounded-full bg-[#5968ea]/20 blur-[70px]" />
          <div className="relative">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#6874f5]/15 text-[#aeb5ff] ring-1 ring-white/10">
              <ShieldCheck className="size-7" />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-[#aeb5ff]">
              Auth0 security layer
            </div>
            <h1 className="mt-2 text-[26px] font-bold tracking-[-.04em] text-white">
              Protected dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Verify your identity with Auth0 before continuing to the Space Call admin sign-in.
            </p>
            <button
              type="button"
              onClick={() =>
                void loginWithRedirect({
                  appState: { returnTo: window.location.pathname || "/dashboard" },
                })
              }
              className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6874f5] text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(104,116,245,.28)] hover:bg-[#7a84ff]"
            >
              <LockKeyhole className="size-4" />
              Continue with Auth0
            </button>
            <div className="mt-5 text-[10px] text-slate-500">
              Auth0 identity verification + Supabase staff authorization
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.email && user.email_verified === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#101b32] p-5">
        <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-white/[.07] p-7 text-center text-white">
          <LockKeyhole className="mx-auto size-8 text-amber-300" />
          <h1 className="mt-4 text-xl font-bold">Verified email required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Verify the email address on your Auth0 account before entering the dashboard.
          </p>
          <button
            type="button"
            onClick={() => void logoutAuth0()}
            className="mt-5 h-10 rounded-xl border border-white/10 px-4 text-[11px] font-bold text-slate-200"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardAuth0Context.Provider value={{ enabled: true, logoutAuth0 }}>
      {children}
    </DashboardAuth0Context.Provider>
  );
}

export default function DashboardAuth0Security({ children }: { children: ReactNode }) {
  if (!isDashboardAuth0Configured || !domain || !clientId) {
    return (
      <DashboardAuth0Context.Provider
        value={{ enabled: false, logoutAuth0: async () => undefined }}
      >
        {children}
      </DashboardAuth0Context.Provider>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      cacheLocation="memory"
      authorizationParams={{
        redirect_uri:
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/dashboard`,
        scope: "openid profile email",
      }}
      onRedirectCallback={(appState) => {
        if (typeof window === "undefined") return;
        const returnTo =
          typeof appState?.returnTo === "string" && appState.returnTo.startsWith("/")
            ? appState.returnTo
            : "/dashboard";
        window.history.replaceState({}, document.title, returnTo);
      }}
    >
      <Auth0Gate>{children}</Auth0Gate>
    </Auth0Provider>
  );
}
