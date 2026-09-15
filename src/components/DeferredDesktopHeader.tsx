import { lazy, Suspense, useEffect, useState } from "react";

const LazySiteHeader = lazy(() =>
  import("@/components/SiteHeader").then(({ SiteHeader }) => ({ default: SiteHeader })),
);

function DesktopHeaderSpace() {
  return <div className="h-[7.75rem]" aria-hidden="true" />;
}

/**
 * SiteHeader contains desktop-only catalog navigation, dropdown primitives and
 * taxonomy helpers. Keeping it behind the desktop media query prevents mobile
 * visitors from downloading/evaluating that code at all.
 *
 * The fixed-height server placeholder preserves desktop layout until the lazy
 * header becomes interactive, avoiding a large content jump during hydration.
 */
export function DeferredDesktopHeader() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div className="hidden lg:block">
      {desktop ? (
        <Suspense fallback={<DesktopHeaderSpace />}>
          <LazySiteHeader />
        </Suspense>
      ) : (
        <DesktopHeaderSpace />
      )}
    </div>
  );
}
