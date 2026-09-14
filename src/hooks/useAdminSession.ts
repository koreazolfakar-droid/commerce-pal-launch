import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "admin" | "editor" | null;

export type AdminSessionState = {
  loading: boolean;
  session: Session | null;
  role: AdminRole;
  refresh: () => Promise<void>;
};

/** Session plus server-verified staff role for the dashboard shell. */
export function useAdminSession(): AdminSessionState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AdminRole>(null);

  const loadRole = async (current: Session | null) => {
    if (!current) {
      setRole(null);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", current.user.id);
    const roles = (data ?? []).map((row) => row.role);
    setRole(roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : null);
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadRole(data.session);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      await loadRole(data.session);
      if (active) setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadRole(next);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { loading, session, role, refresh };
}
