import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { STORE_NAME } from "@/lib/storeConfig";

const LazySearchOverlay = lazy(() =>
  import("@/components/SearchOverlay").then(({ SearchOverlay }) => ({
    default: SearchOverlay,
  })),
);
const LazyMobileMenu = lazy(() =>
  import("@/components/MobileMenu").then(({ MobileMenu }) => ({
    default: MobileMenu,
  })),
);
const LazyMobileCategoryRail = lazy(() =>
  import("@/components/MobileCategoryRail").then(({ MobileCategoryRail }) => ({
    default: MobileCategoryRail,
  })),
);

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Mobile app style top bar: brand, quick actions, search field and category strip. */
export function MobileTopBar({
  activeSlug,
  showCategoryRail = true,
}: {
  activeSlug?: string;
  showCategoryRail?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const cmsStoreName = cms?.settings["site_name"];
  const cmsLogoUrl = cms?.settings["logo_url"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const logoUrl =
    typeof cmsLogoUrl === "string" && cmsLogoUrl.trim() ? cmsLogoUrl.trim() : "/logo.svg";

  return (
    <>
      <header className="mobile-top-bar sticky top-0 z-40 border-b border-border/60 bg-background/95 shadow-[0_8px_24px_-22px_rgba(15,23,42,.55)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1 px-3 py-2.5">
          <div className="flex w-[5.625rem] shrink-0 items-center sm:w-[8.5rem]">
            <button
              type="button"
              aria-label={t("openMenu")}
              onClick={() => setMenuOpen(true)}
              className="press grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-surface"
            >
              <Menu aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <Link
            to="/"
            aria-label={`${storeName} home`}
            data-testid="mobile-brand"
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5"
          >
            <img
              src={logoUrl}
              alt={storeName}
              width={51}
              height={34}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-[34px] w-auto shrink-0 object-contain drop-shadow-sm"
            />
            <span className="truncate text-[17px] font-black tracking-[-0.025em]">{storeName}</span>
          </Link>
          <div className="flex w-[5.625rem] shrink-0 items-center justify-end gap-0.5 sm:w-[8.5rem]">
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} saved`}
              className="press relative hidden h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface sm:grid"
            >
              <Heart className="h-[21px] w-[21px]" strokeWidth={1.9} />
              <Badge value={wishlistCount} />
            </Link>
            <ThemeToggle className="h-10 w-10" />
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("space-cell:open-cart"))}
              aria-label={`Cart, ${cartCount} items`}
              className="press relative grid h-10 w-10 place-items-center rounded-full border border-transparent transition-colors hover:border-border hover:bg-surface"
            >
              <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.9} />
              <Badge value={cartCount} />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-border/50 bg-background lg:hidden">
        <div className="mx-auto flex max-w-md min-w-0 items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="press flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 text-start text-sm text-muted-foreground shadow-sm transition hover:border-primary/20 hover:bg-accent/60"
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{t("search")}</span>
          </button>
        </div>

        {showCategoryRail ? (
          <Suspense
            fallback={
              <div className="scroll-rail flex gap-2 px-4 pb-2" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="shimmer h-8 w-[5.625rem] shrink-0 rounded-full bg-surface"
                  />
                ))}
              </div>
            }
          >
            <LazyMobileCategoryRail activeSlug={activeSlug} />
          </Suspense>
        ) : null}
      </div>

      {menuOpen ? (
        <Suspense fallback={null}>
          <LazyMobileMenu open={menuOpen} onOpenChange={setMenuOpen} hideTrigger />
        </Suspense>
      ) : null}
      {searchOpen ? (
        <Suspense fallback={null}>
          <LazySearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
