import { useRef } from "react";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "./useDashboardUnsavedChanges";

/** Capture the opening snapshot, including asynchronously loaded editing values. */
export function useDashboardFormGuard(
  open: boolean,
  value: unknown,
  saving: boolean,
  onClose: () => void,
) {
  const { t } = useLanguage();
  const state = useRef({ open: false, baseline: "" });
  const serialized = JSON.stringify(value);
  if (open && !state.current.open) state.current.baseline = serialized;
  state.current.open = open;
  const dirty = open && serialized !== state.current.baseline;
  const markSaved = useDashboardUnsavedChanges(dirty);
  const close = () => {
    if (saving) return false;
    if (dirty && !window.confirm(t("Discard unsaved changes?"))) return false;
    markSaved();
    state.current.open = false;
    onClose();
    return true;
  };
  return { close, dirty, markSaved };
}
