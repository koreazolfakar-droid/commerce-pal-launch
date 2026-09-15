import { lazy, Suspense, useEffect, useState } from "react";

const LazyToaster = lazy(() =>
  import("@/components/ui/sonner").then(({ Toaster }) => ({ default: Toaster })),
);

const TOASTER_IDLE_TIMEOUT_MS = 5500;

/**
 * Toast rendering is not needed to paint or hydrate the storefront. Keep Sonner
 * out of the critical startup work, but mount it immediately on the first real
 * user interaction so feedback remains available for cart/wishlist actions.
 */
export function DeferredToaster() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (enabled) return;

    let idleId: number | null = null;
    let timer: number | null = null;

    const enable = () => setEnabled(true);
    const interactionEvents: Array<keyof DocumentEventMap> = ["pointerdown", "keydown"];

    for (const eventName of interactionEvents) {
      document.addEventListener(eventName, enable, { once: true, capture: true, passive: true });
    }

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: TOASTER_IDLE_TIMEOUT_MS });
    } else {
      timer = window.setTimeout(enable, TOASTER_IDLE_TIMEOUT_MS);
    }

    return () => {
      for (const eventName of interactionEvents) {
        document.removeEventListener(eventName, enable, true);
      }
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <LazyToaster />
    </Suspense>
  );
}
