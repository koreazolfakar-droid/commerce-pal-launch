import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, MapPin, Menu, Search } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { CustomerAccountButton } from "@/components/customer-auth/CustomerAccountButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
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
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
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
  const { selectedAddress, openAddressBook } = useCustomerAccount();
  const cmsStoreName = cms?.settings["site_name"];
  const cmsLogoUrl = cms?.settings["logo_url"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const logoUrl =
    typeof cmsLogoUrl === "string" && cmsLogoUrl.trim() ? cmsLogoUrl.trim() : "/logo.svg";

  return (
    <>
      <header className="mobile-top-bar sticky top-0 z-40 border-b border-border/45 bg-background/96 shadow-[0_8px_24px_-24px_rgba(15,23,42,.48)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[3.75rem] w-full max-w-md grid-cols-[1fr_auto_1fr] items-center px-3">
          <div className="flex min-w-0 items-center justify-start gap-1.5">
            <button
              type="button"
              aria-label={t("openMenu")}
              onClick={() => setMenuOpen(true)}
              className="press grid h-10 w-10 shrink-0 place-items-center rounded-none bg-transparent shadow-none transition-colors hover:bg-transparent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <Menu aria-hidden className="h-5 w-5" strokeWidth={1.9} />
            </button>
            <CustomerAccountButton
              variant="icon"
              className="h-10 w-10 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent hover:text-primary"
            />
          </div>

          <Link
            to="/"
            aria-label={`${storeName} home`}
            data-testid="mobile-brand"
            className="mx-2 flex min-w-0 max-w-[11.25rem] items-center justify-center gap-1.5 sm:max-w-none"
          >
            <img
              src={logoUrl}
              alt={storeName}
              width={48}
              height={32}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-8 w-auto shrink-0 object-contain"
            />
            <span className="truncate text-[16px] font-bold leading-none tracking-[-0.02em] sm:text-[17px]">
              {storeName}
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} saved`}
              className="press relative hidden h-10 w-10 shrink-0 place-items-center rounded-none bg-transparent shadow-none transition-colors hover:bg-transparent hover:text-primary sm:grid"
            >
              <Heart className="h-5 w-5" strokeWidth={1.9} />
              <Badge value={wishlistCount} />
            </Link>
            <ThemeToggle className="h-10 w-10 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent hover:text-primary" />
            <button
              type="button"
              onClick={openAddressBook}
              aria-label={
                selectedAddress
                  ? `Delivery location: ${selectedAddress.nickname || selectedAddress.areaStreet || selectedAddress.formattedAddress || "saved"}`
                  : "Choose delivery location"
              }
              title={selectedAddress ? "Delivery location" : "Choose delivery location"}
              data-testid="mobile-header-location"
              className="press relative grid h-10 w-10 shrink-0 place-items-center rounded-none bg-transparent shadow-none transition-colors hover:bg-transparent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <MapPin className="h-5 w-5" strokeWidth={1.9} />
              {selectedAddress ? (
                <span
                  aria-hidden="true"
                  className="absolute end-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                />
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-border/40 bg-background lg:hidden">
        <div className="mx-auto max-w-md px-3 pb-3 pt-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="press flex h-12 min-w-0 w-full items-center gap-3 rounded-2xl border border-border/65 bg-card px-4 text-start text-[13px] font-medium text-muted-foreground shadow-sm transition hover:border-primary/25 hover:bg-accent/50"
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
