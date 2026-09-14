import { useEffect, useRef } from "react";
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
  const railRef = useRef<HTMLDivElement>(null);
  if (!brands.length) return null;

  const showEdgeHint = brands.length > 4;
  const brandSignature = brands.map((brand) => brand.slug).join("|");

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const centerRail = () => {
      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (maxScroll <= 0) return;
      rail.scrollLeft = maxScroll / 2;
    };

    const frame = window.requestAnimationFrame(centerRail);
    return () => window.cancelAnimationFrame(frame);
  }, [brandSignature]);

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
          ref={railRef}
          className="flex touch-pan-x snap-x snap-proximity items-center gap-3 overflow-x-auto px-[calc(50%-3rem)] py-2 scroll-smooth overscroll-x-contain [scroll-padding-inline:calc(50%-3rem)] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-[calc(50%-3.5rem)] sm:py-2.5 sm:[scroll-padding-inline:calc(50%-3.5rem)] lg:gap-7 lg:px-[calc(50%-4rem)] lg:[scroll-padding-inline:calc(50%-4rem)]"
          role="list"
          aria-label={t("topBrands")}
        >
          {brands.map((brand) => {
            const compactLength = brand.label.replace(/[^a-z0-9]/gi, "").length;
            const itemWidth = Math.min(124, Math.max(92, 78 + compactLength * 4));

            return (
              <Link
                key={brand.slug}
                to="/brand/$slug"
                params={{ slug: brand.slug }}
                role="listitem"
                aria-label={brand.label}
                style={{ width: itemWidth }}
                className="group flex h-14 shrink-0 snap-center select-none items-center justify-center overflow-hidden px-1.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.975] motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:px-2 md:hover:-translate-y-[3px] md:hover:scale-[1.11]"
              >
                <BrandLogo
                  slug={brand.slug}
                  label={brand.label}
                  size={38}
                  wordmark
                  frameless
                  normalizeForRail
                  className="pointer-events-none max-w-full"
                  {...(brand.image ? { imageUrl: brand.image } : {})}
                />
              </Link>
            );
          })}
        </div>

        {showEdgeHint ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-1 left-0 w-5 bg-gradient-to-r from-background/88 via-background/35 to-transparent"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-1 right-0 w-5 bg-gradient-to-l from-background/88 via-background/35 to-transparent"
              aria-hidden="true"
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
