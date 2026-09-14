import { useEffect } from "react";

import { useCartStore } from "@/stores/cartStore";

export function useCartSync() {
  const syncCart = useCartStore((state) => state.syncCart);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const runInitialSync = () => {
      if (!cancelled) void syncCart();
    };

    // The persisted cart is already available immediately. Defer the network
    // reconciliation so it does not compete with hero/catalog requests on first load.
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(runInitialSync, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(runInitialSync, 450);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncCart();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncCart]);
}
