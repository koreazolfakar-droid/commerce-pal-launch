import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { useLanguage } from "@/lib/i18n";
import { importWithChunkRecovery } from "@/lib/lazyChunkRecovery";
import { STORE_NAME } from "@/lib/storeConfig";

const LazySiteHeader = lazy(() =>
  importWithChunkRecovery("site-header", () =>
    import("@/components/SiteHeader").then(({ SiteHeader }) => ({ default: SiteHeader })),
  ),
);

function DesktopHeaderFallback() {
  const { t } = useLanguage();

  return (
    <>
      <div className="bg-hero text-hero-muted">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs font-medium">
          <span>{t("freeDelivery")}</span>
          <Link to="/my-orders" preload={false} className="hover:underline">
            {t("trackOrder")}
          </Link>
        </div>
      </div>
      <header data-testid="desktop-header-fallback" className="sticky top-0 border-b bg-background">
        <div className="mx-auto grid min-h-[4.5rem] max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4">
          <Link to="/" preload={false} className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.svg"
              alt=""
              width={54}
              height={36}
              className="h-9 w-auto object-contain"
            />
            <span className="truncate text-[19px] font-bold tracking-tight">{STORE_NAME}</span>
          </Link>
          <Link
            to="/search"
            preload={false}
            className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg border bg-surface px-4 text-sm text-muted-foreground hover:border-primary"
          >
            <Search aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{t("search")}</span>
          </Link>
          <Link
            to="/cart"
            preload={false}
            aria-label={t("bag")}
            className="grid size-11 place-items-center rounded-xl border text-foreground hover:bg-surface"
          >
            <ShoppingBag aria-hidden className="size-5" />
          </Link>
        </div>
        <nav aria-label={t("shop")} className="border-t">
          <div className="mx-auto flex min-h-12 max-w-7xl items-center justify-between gap-3 px-4">
            <Link to="/shop" preload={false} className="px-3 font-semibold hover:underline">
              {t("shop")}
            </Link>
            <Link to="/help" preload={false} className="px-3 text-muted-foreground hover:underline">
              {t("support")}
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}

/** Render useful desktop navigation while the interactive catalog header loads. */
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
        <Suspense fallback={<DesktopHeaderFallback />}>
          <LazySiteHeader />
        </Suspense>
      ) : (
        <DesktopHeaderFallback />
      )}
    </div>
  );
}
