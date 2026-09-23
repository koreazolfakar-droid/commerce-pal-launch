import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type CustomerOAuthError = "cancelled" | "failed" | null;

type CustomerAuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authOpen: boolean;
  oauthError: CustomerOAuthError;
  openAuth: () => void;
  closeAuth: () => void;
  setAuthOpen: (open: boolean) => void;
  clearOAuthError: () => void;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);
const RETURN_PATH_KEY = "space-call:customer-auth-return-path";

function restorePostAuthPath() {
  if (typeof window === "undefined") return;
  const target = window.sessionStorage.getItem(RETURN_PATH_KEY);
  if (!target) return;
  window.sessionStorage.removeItem(RETURN_PATH_KEY);

  // Only restore same-origin relative paths. Never trust storage as an external redirect target.
  if (!target.startsWith("/") || target.startsWith("//")) return;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (target !== current) window.location.replace(target);
}

function clearOAuthQueryParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const keys = ["code", "error", "error_code", "error_description", "state"];
  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const next = url.pathname + (url.search ? url.search : "") + url.hash;
  window.history.replaceState(window.history.state, "", next);
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [oauthError, setOAuthError] = useState<CustomerOAuthError>(null);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const bootstrap = async () => {
      let nextSession: Session | null = null;

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const oauthFailure = params.get("error");
        const oauthDescription = params.get("error_description");
        const code = params.get("code");

        if (oauthFailure) {
          clearOAuthQueryParams();
          if (mounted) {
            const description = (oauthDescription || oauthFailure).toLowerCase();
            setOAuthError(description.includes("access_denied") ? "cancelled" : "failed");
            setAuthOpen(true);
          }
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          clearOAuthQueryParams();

          if (error) {
            if (mounted) {
              setOAuthError("failed");
              setAuthOpen(true);
            }
          } else {
            nextSession = data.session ?? null;
          }
        }
      }

      if (!nextSession) {
        const { data } = await supabase.auth.getSession();
        nextSession = data.session ?? null;
      }

      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
      if (nextSession) restorePostAuthPath();

      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, sessionAfterChange) => {
        if (!mounted) return;
        setSession(sessionAfterChange);
        setLoading(false);
        if (sessionAfterChange) restorePostAuthPath();
      });
      subscription = authSubscription;
    };

    void bootstrap();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const clearOAuthError = useCallback(() => setOAuthError(null), []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      authOpen,
      oauthError,
      openAuth,
      closeAuth,
      setAuthOpen,
      clearOAuthError,
      signOut,
    }),
    [session, loading, authOpen, oauthError, openAuth, closeAuth, clearOAuthError, signOut],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const value = useContext(CustomerAuthContext);
  if (!value) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return value;
}
