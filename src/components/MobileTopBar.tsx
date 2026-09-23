import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Menu, Search } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { CustomerAccountButton } from "@/components/customer-auth/CustomerAccountButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
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

/** Mobile app style top bar: brand, quick actions, search field and category strip. */
export function MobileTopBar({
  activeSlug,
  showSearch = true,
  showCategoryRail = true,
}: {
  activeSlug?: string;
  showSearch?: boolean;
  showCategoryRail?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const { selectedAddress, openAddressBook } = useCustomerAccount();
  const cmsStoreName = cms?.settings["site_name"];
  const cmsLogoUrl = cms?.settings["logo_url"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const logoUrl =
    typeof cmsLogoUrl === "string" && cmsLogoUrl.trim() ? cmsLogoUrl.trim() : "/logo.svg";

  useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("space-call:open-search", openSearch);
    return () => window.removeEventListener("space-call:open-search", openSearch);
  }, []);

  return (
    <>
      <header className="mobile-top-bar sticky top-0 z-40 border-b border-border/45 bg-background/96 shadow-[0_8px_24px_-24px_rgba(15,23,42,.48)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[4.25rem] w-full max-w-md grid-cols-[2.75rem_minmax(0,1fr)_5.75rem] items-center gap-2 px-4">
          <button
            type="button"
            aria-label={t("openMenu")}
            onClick={() => setMenuOpen(true)}
            className="mobile-header-action press grid h-11 w-11 shrink-0 place-items-center rounded-none bg-transparent shadow-none transition-colors hover:bg-transparent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <Menu aria-hidden className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </button>

          <Link
            to="/"
            aria-label={`${storeName} home`}
            data-testid="mobile-brand"
            className="flex min-w-0 items-center justify-center gap-2 overflow-hidden"
          >
            <img
              src={logoUrl}
              alt={storeName}
              width={54}
              height={40}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-9 w-auto max-w-[3.4rem] shrink-0 object-contain sm:h-10 sm:max-w-[3.8rem]"
            />
            <span className="truncate text-[18px] font-extrabold leading-none tracking-[-0.03em] sm:text-[19px]">
              {storeName}
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1">
            <ThemeToggle className="mobile-header-action h-11 w-11 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent hover:text-primary" />
            <CustomerAccountButton
              variant="icon"
              className="mobile-header-action h-11 w-11 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent hover:text-primary"
            />
          </div>
        </div>
      </header>

      {showSearch || showCategoryRail ? (
        <div className="border-b border-border/40 bg-background lg:hidden">
          {showSearch ? (
            <div className="mx-auto max-w-md px-4 pb-3 pt-2.5">
              <button
                type="button"
                onClick={openAddressBook}
                aria-label={
                  selectedAddress
                    ? `Delivery location: ${selectedAddress.nickname || selectedAddress.areaStreet || selectedAddress.formattedAddress || "saved"}`
                    : "Choose delivery location"
                }
                data-testid="mobile-header-location"
                className="press mb-2.5 flex min-h-10 w-full items-center gap-2 bg-transparent px-1 text-start transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                <MapPin className="h-[19px] w-[19px] shrink-0 text-primary" strokeWidth={2} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                  {selectedAddress ? (
                    <>
                      <span>{language === "ar" ? "التوصيل إلى" : "Deliver to"} </span>
                      <span className="font-extrabold text-foreground">
                        {selectedAddress.nickname ||
                          selectedAddress.areaStreet ||
                          selectedAddress.formattedAddress}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-foreground">
                      {language === "ar" ? "اختر موقع التوصيل" : "Choose delivery location"}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.9} aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="press flex h-[3.25rem] min-w-0 w-full items-center gap-3 rounded-2xl border border-border/65 bg-card px-4 text-start text-[13px] font-medium text-muted-foreground shadow-sm transition hover:border-primary/25 hover:bg-accent/50"
              >
                <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                <span className="truncate">{t("search")}</span>
              </button>
            </div>
          ) : null}

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
      ) : null}

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
