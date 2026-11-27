import { useEffect } from "react";

import { subscribeStorefrontRefresh } from "@/lib/nativeStore";
import { useCartStore } from "@/stores/cartStore";

const CART_SYNC_IDLE_TIMEOUT_MS = 2000;
const CART_SYNC_FALLBACK_DELAY_MS = 500;

export function useCartSync() {
  const syncCart = useCartStore((state) => state.syncCart);

  useEffect(() => {
    let cancelled = false;
    let idleRequestId: number | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const runSync = () => {
      if (!cancelled) void syncCart();
    };

    // Preserve the persisted cart immediately, but keep the cart synchronization
    // request out of the critical loading path. This reduces competition with LCP
    // images, fonts, and storefront data on returning visits that already have a cart.
    if ("requestIdleCallback" in window) {
      idleRequestId = window.requestIdleCallback(runSync, {
        timeout: CART_SYNC_IDLE_TIMEOUT_MS,
      });
    } else {
      fallbackTimer = setTimeout(runSync, CART_SYNC_FALLBACK_DELAY_MS);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncCart();
    };

    const unsubscribeStorefrontRefresh = subscribeStorefrontRefresh(() => {
      if (!cancelled) void syncCart();
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      unsubscribeStorefrontRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleRequestId !== null) window.cancelIdleCallback(idleRequestId);
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
    };
  }, [syncCart]);
}
