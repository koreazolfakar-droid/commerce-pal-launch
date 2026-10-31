import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { StoreBrand } from "@/lib/brandDirectory";
import { importWithChunkRecovery } from "@/lib/lazyChunkRecovery";
import { BrandRailSkeleton } from "@/components/LoadingSkeletons";

const LazyTopBrands = lazy(() =>
  importWithChunkRecovery("top-brands", () =>
    import("@/components/TopBrands").then(({ TopBrands }) => ({ default: TopBrands })),
  ),
);

export function DeferredTopBrands({ brands }: { brands: StoreBrand[] }) {
  const markerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (enabled) return;

    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setEnabled(true), 1600);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setEnabled(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [enabled]);

  return (
    <div ref={markerRef} data-deferred-top-brands>
      {enabled ? (
        <Suspense fallback={<BrandRailSkeleton />}>
          <LazyTopBrands brands={brands} />
        </Suspense>
      ) : (
        <BrandRailSkeleton />
      )}
    </div>
  );
}
