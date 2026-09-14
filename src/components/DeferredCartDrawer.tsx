import { lazy, Suspense, useEffect, useState } from "react";

const LazyCartDrawer = lazy(() =>
  import("@/components/CartDrawer").then(({ CartDrawer }) => ({ default: CartDrawer })),
);

/**
 * Keep the heavy cart sheet out of the initial storefront bundle. The lightweight
 * cart badge/store state can hydrate immediately; the sheet UI is fetched only
 * when a user actually asks to open it.
 */
export function DeferredCartDrawer() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setMounted(true);
      setOpen(true);
    };
    document.addEventListener("space-cell:open-cart", handleOpen);
    return () => document.removeEventListener("space-cell:open-cart", handleOpen);
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <LazyCartDrawer hideTrigger open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
