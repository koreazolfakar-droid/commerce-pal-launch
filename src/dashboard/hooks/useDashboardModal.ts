import { useEffect, useRef } from "react";
import { useDashboardDialogFocus } from "@/dashboard/hooks/useDashboardDialogFocus";
let locks = 0;
let previousOverflow = "";
export function useDashboardModal(onClose: () => void, active = true) {
  const ref = useRef<HTMLDivElement>(null);
  useDashboardDialogFocus(active, ref, onClose);
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
  return ref;
}
