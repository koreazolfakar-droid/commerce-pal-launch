import { useLayoutEffect, useId } from "react";
import { setDashboardDraftDirty } from "@/dashboard/lib/unsavedChanges";
export function useDashboardUnsavedChanges(dirty: boolean) {
  const key = useId();
  useLayoutEffect(() => {
    setDashboardDraftDirty(key, dirty);
    return () => setDashboardDraftDirty(key, false);
  }, [dirty, key]);
  return () => setDashboardDraftDirty(key, false);
}
