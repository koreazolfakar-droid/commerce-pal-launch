import { useEffect } from "react";

import { useCartStore } from "@/stores/cartStore";

export function useCartSync() {
  const syncCart = useCartStore((state) => state.syncCart);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let idleId: number | undefined;

    const runInitialSync = () => {
      if (!cancelled) void syncCart();
    };

    // The persisted cart is already available immediately. Defer the network
    // reconciliation so it does not compete with hero/catalog requests on first load.
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(runInitialSync, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(runInitialSync, 450);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncCart();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncCart]);
}
