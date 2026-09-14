import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { useLanguage } from "@/lib/i18n";

/**
 * Premium, minimal brand strip for the homepage.
 *
 * Keep this component presentation-only: every logo preserves the existing
 * brand route while the strip stays compact, touch-friendly and horizontally
 * scrollable without introducing cards, borders or decorative chrome.
 */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  if (!brands.length) return null;

  const showMobileEdgeHint = brands.length > 4;

  return (
    <section
      aria-labelledby="top-brands"
      data-testid="top-brands"
      className="-mb-2 sm:-mb-3"
    >
      <div className="home-section-header !mb-2 flex-nowrap items-end sm:!mb-2.5">
        <div className="min-w-0 flex-1">
          <h2 id="top-brands" className="text-xl font-black tracking-tight">
            {t("topBrands")}
          </h2>
        </div>
        <Link
          to="/brands"
          className="inline-flex min-h-10 shrink-0 items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:overflow-visible">
        <div
          className="flex touch-pan-x snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-4 py-1.5 pe-12 scroll-smooth overscroll-x-contain [scroll-padding-inline:1rem] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-0 sm:py-2 sm:pe-6 lg:gap-7"
          role="list"
          aria-label={t("topBrands")}
        >
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              to="/brand/$slug"
              params={{ slug: brand.slug }}
              role="listitem"
              aria-label={brand.label}
              className="group flex h-14 w-[4.7rem] shrink-0 snap-start select-none items-center justify-center transition-transform duration-[250ms] ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:w-28 md:hover:-translate-y-0.5 md:hover:scale-[1.08] lg:w-[7.5rem]"
            >
              <BrandLogo
                slug={brand.slug}
                label={brand.label}
                size={36}
                wordmark
                frameless
                normalizeForRail
                className="pointer-events-none sm:scale-[1.12] lg:scale-[1.18]"
                {...(brand.image ? { imageUrl: brand.image } : {})}
              />
            </Link>
          ))}
        </div>

        {showMobileEdgeHint ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-1 left-0 w-4 bg-gradient-to-r from-background/90 via-background/45 to-transparent sm:hidden"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-1 right-0 w-5 bg-gradient-to-l from-background/90 via-background/45 to-transparent sm:hidden"
              aria-hidden="true"
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
