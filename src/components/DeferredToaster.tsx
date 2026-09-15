import { lazy, Suspense, useEffect, useState } from "react";

const LazyToaster = lazy(() =>
  import("@/components/ui/sonner").then(({ Toaster }) => ({ default: Toaster })),
);

const TOASTER_START_DELAY_MS = 5500;

/**
 * Toast rendering is not needed to paint or hydrate the storefront. Keep Sonner
 * out of the critical startup work, but mount it immediately on the first real
 * user interaction so feedback remains available for cart/wishlist actions.
 */
export function DeferredToaster() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (enabled) return;

    const enable = () => setEnabled(true);
    const interactionEvents: Array<keyof DocumentEventMap> = ["pointerdown", "keydown"];

    for (const eventName of interactionEvents) {
      document.addEventListener(eventName, enable, { once: true, capture: true, passive: true });
    }

    const timer = window.setTimeout(enable, TOASTER_START_DELAY_MS);

    return () => {
      for (const eventName of interactionEvents) {
        document.removeEventListener(eventName, enable, true);
      }
      window.clearTimeout(timer);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <LazyToaster />
    </Suspense>
  );
}
