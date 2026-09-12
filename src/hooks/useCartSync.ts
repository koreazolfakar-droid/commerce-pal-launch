import { useEffect } from "react";

import { useCartStore } from "@/stores/cartStore";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

export function useCartSync() {
  const syncCart = useCartStore((state) => state.syncCart);

  useEffect(() => {
    const browser = window as IdleWindow;
    let idleId: number | undefined;
    let timerId: number | undefined;

    // Persisted cart state is already available locally for the first paint.
    // Reconcile with Shopify once the browser is idle instead of competing with
    // the page's critical requests and image/font work on initial navigation.
    if (browser.requestIdleCallback) {
      idleId = browser.requestIdleCallback(() => void syncCart(), { timeout: 1500 });
    } else {
      timerId = window.setTimeout(() => void syncCart(), 700);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncCart();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleId !== undefined) browser.cancelIdleCallback?.(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [syncCart]);
}
