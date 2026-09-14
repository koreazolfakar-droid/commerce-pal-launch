import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { useLanguage } from "@/lib/i18n";

/**
 * Premium, minimal brand strip for the homepage.
 *
 * The rail opens around the middle brand so there is content on both sides,
 * while keeping native/free horizontal scrolling on touch devices. Avoid
 * scroll-snap here: it made short swipes feel sticky and could pull the rail
 * away from the user's intended position.
 */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  const railRef = useRef<HTMLDivElement>(null);
  const showEdgeHint = brands.length > 4;
  const brandSignature = brands.map((brand) => brand.slug).join("|");

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || brands.length === 0) return;

    const centerMiddleBrand = () => {
      const middleIndex = Math.floor((brands.length - 1) / 2);
      const target = rail.querySelector<HTMLElement>(
        `[data-brand-index="${middleIndex}"]`,
      );
      if (!target) return;

      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (maxScroll <= 0) return;

      const targetLeft =
        target.offsetLeft - (rail.clientWidth - target.offsetWidth) / 2;
      const centeredLeft = Math.min(maxScroll, Math.max(0, targetLeft));

      rail.scrollTo({ left: centeredLeft, behavior: "auto" });
    };

    // Wait until the browser has measured the rail, then center the real
    // middle item instead of approximating with half of maxScroll.
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(centerMiddleBrand);
      rail.dataset.centerFrame = String(secondFrame);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      const secondFrame = Number(rail.dataset.centerFrame);
      if (Number.isFinite(secondFrame)) window.cancelAnimationFrame(secondFrame);
      delete rail.dataset.centerFrame;
    };
  }, [brandSignature, brands.length]);

  if (!brands.length) return null;

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
          dir="ltr"
          style={{
            paddingInline: "max(1rem, calc(50% - 3rem))",
          }}
          className="flex items-center gap-3 overflow-x-auto overflow-y-hidden py-2 scroll-smooth overscroll-x-contain touch-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:py-2.5 lg:gap-7"
          role="list"
          aria-label={t("topBrands")}
        >
          {brands.map((brand, index) => {
            const compactLength = brand.label.replace(/[^a-z0-9]/gi, "").length;
            const itemWidth = Math.min(132, Math.max(96, 82 + compactLength * 4));

            return (
              <Link
                key={brand.slug}
                to="/brand/$slug"
                params={{ slug: brand.slug }}
                role="listitem"
                aria-label={brand.label}
                data-brand-index={index}
                style={{ width: itemWidth }}
                className="group flex h-14 shrink-0 select-none items-center justify-center overflow-hidden px-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.975] motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:px-2.5 md:hover:-translate-y-[3px] md:hover:scale-[1.11]"
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
