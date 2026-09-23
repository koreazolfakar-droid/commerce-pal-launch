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

type CustomerAuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  setAuthOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);
const RETURN_PATH_KEY = "space-call:customer-auth-return-path";

function restorePostAuthPath() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/auth/callback") return;
  const target = window.sessionStorage.getItem(RETURN_PATH_KEY);
  if (!target) return;
  window.sessionStorage.removeItem(RETURN_PATH_KEY);

  // Only restore same-origin relative paths. Never trust storage as an external redirect target.
  if (!target.startsWith("/") || target.startsWith("//")) return;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (target !== current) window.location.replace(target);
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session) restorePostAuthPath();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
      if (nextSession) restorePostAuthPath();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

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
      openAuth,
      closeAuth,
      setAuthOpen,
      signOut,
    }),
    [session, loading, authOpen, openAuth, closeAuth, signOut],
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
