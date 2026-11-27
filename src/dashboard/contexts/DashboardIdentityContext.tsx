import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";
import { supabase } from "@/integrations/supabase/client";
const Context = createContext<{ role: DashboardRole | null; name: string; loading: boolean }>({
  role: null,
  name: "",
  loading: true,
});
export const useDashboardIdentity = () => useContext(Context);
export function DashboardIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState({
    role: null as DashboardRole | null,
    name: "",
    loading: true,
  });
  useEffect(() => {
    let cancelled = false;
    Promise.all([getDashboardRole(), supabase.auth.getUser()])
      .then(([role, { data }]) => {
        if (cancelled) return;
        const name =
          data.user?.user_metadata?.full_name ||
          data.user?.user_metadata?.name ||
          data.user?.email ||
          "Staff";
        setIdentity({ role, name: String(name), loading: false });
      })
      .catch(() => {
        if (!cancelled) setIdentity({ role: null, name: "Staff", loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return <Context.Provider value={identity}>{children}</Context.Provider>;
}
