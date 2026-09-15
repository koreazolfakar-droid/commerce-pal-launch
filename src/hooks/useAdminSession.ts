import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardAccess } from "@/lib/cmsAdmin.functions";
import type { DashboardRole } from "@/lib/cmsAdmin.server";

export type AdminSessionState = {
  loading: boolean;
  session: Session | null;
  role: DashboardRole | null;
  email: string | null;
  setupRequired: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/** Browser session plus a server-verified dashboard role. */
export function useAdminSession(): AdminSessionState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (current: Session | null) => {
    setSession(current);
    setError(null);

    if (!current) {
      setRole(null);
      setEmail(null);
      setSetupRequired(false);
      setLoading(false);
      return;
    }

    try {
      const access = await fetchDashboardAccess();
      setRole(access.role);
      setEmail(access.email ?? current.user.email ?? null);
      setSetupRequired(access.setupRequired);
    } catch (accessError) {
      setRole(null);
      setEmail(current.user.email ?? null);
      setSetupRequired(false);
      setError(accessError instanceof Error ? accessError.message : "تعذر التحقق من صلاحية لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }
    await load(data.session);
  }, [load]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      void load(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      // Run outside Supabase's auth callback so the server-function middleware can
      // safely read the newly persisted session without re-entering the auth lock.
      window.setTimeout(() => {
        if (active) void refresh();
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [load, refresh]);

  return { loading, session, role, email, setupRequired, error, refresh };
}
