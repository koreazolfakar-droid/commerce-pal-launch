import { lazy, Suspense, useEffect, useState } from "react";

const LazyCartDrawer = lazy(() =>
  import("@/components/CartDrawer").then((module) => ({ default: module.CartDrawer })),
);

/**
 * Lightweight event host that keeps the relatively expensive Radix cart sheet
 * out of the startup bundle. The real drawer is downloaded only after the user
 * asks to open the bag, then remains mounted for subsequent opens.
 */
export function GlobalCartDrawer() {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const open = () => setRequested(true);
    document.addEventListener("space-cell:open-cart", open);
    return () => document.removeEventListener("space-cell:open-cart", open);
  }, []);

  if (!requested) return null;

  return (
    <Suspense fallback={null}>
      <LazyCartDrawer hideTrigger initialOpen />
    </Suspense>
  );
}
