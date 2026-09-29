import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { importWithChunkRecovery } from "@/lib/lazyChunkRecovery";

const LazySiteFooter = lazy(() =>
  importWithChunkRecovery("site-footer", () =>
    import("@/components/SiteFooter").then(({ SiteFooter }) => ({ default: SiteFooter })),
  ),
);

export function DeferredSiteFooter() {
  const markerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (enabled) return;

    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setEnabled(true), 4000);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setEnabled(true);
        observer.disconnect();
      },
      { rootMargin: "1200px 0px" },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [enabled]);

  return (
    <div ref={markerRef} data-deferred-site-footer>
      {enabled ? (
        <Suspense fallback={<div className="min-h-64" aria-hidden="true" />}>
          <LazySiteFooter />
        </Suspense>
      ) : (
        <div className="min-h-64" aria-hidden="true" />
      )}
    </div>
  );
}
