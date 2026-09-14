import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { orderedBrands } from "@/lib/homeMerchandising";
import { useLanguage } from "@/lib/i18n";

/**
 * Premium, minimal brand strip for the homepage.
 *
 * The strongest brand opens in the center with the next strongest brands
 * immediately around it. The inner track uses min-width: 100%, so a short
 * brand list is centered without artificial empty padding; longer lists keep
 * native/free horizontal scrolling in both directions.
 */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  const railRef = useRef<HTMLDivElement>(null);

  const rankedBrands = useMemo(() => orderedBrands(brands), [brands]);
  const railBrands = useMemo(() => {
    if (rankedBrands.length <= 2) return rankedBrands;

    const strongest = rankedBrands[0]!;
    const left: ShopifyBrand[] = [];
    const right: ShopifyBrand[] = [];

    rankedBrands.slice(1).forEach((brand, index) => {
      const storefrontRank = index + 2;
      if (storefrontRank % 2 === 0) right.push(brand);
      else left.push(brand);
    });

    return [...left.reverse(), strongest, ...right];
  }, [rankedBrands]);

  const strongestSlug = rankedBrands[0]?.slug;
  const showEdgeHint = railBrands.length > 4;
  const brandSignature = railBrands.map((brand) => brand.slug).join("|");

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !strongestSlug) return;

    const centerStrongestBrand = () => {
      const target = rail.querySelector<HTMLElement>(`[data-featured-brand="true"]`);
      if (!target) return;

      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (maxScroll <= 0) {
        rail.scrollLeft = 0;
        return;
      }

      const targetLeft = target.offsetLeft - (rail.clientWidth - target.offsetWidth) / 2;
      rail.scrollTo({
        left: Math.min(maxScroll, Math.max(0, targetLeft)),
        behavior: "auto",
      });
    };

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(centerStrongestBrand);
      rail.dataset.centerFrame = String(secondFrame);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      const secondFrame = Number(rail.dataset.centerFrame);
      if (Number.isFinite(secondFrame)) window.cancelAnimationFrame(secondFrame);
      delete rail.dataset.centerFrame;
    };
  }, [brandSignature, strongestSlug]);

  if (!railBrands.length) return null;

  return (
    <section
      aria-labelledby="top-brands"
      data-testid="top-brands"
      className="-mt-1 -mb-3 sm:-mb-4"
    >
      <div className="home-section-header !mb-1.5 flex-nowrap items-end sm:!mb-2">
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

      <div className="relative -mx-4 overflow-hidden sm:mx-0">
        <div
          ref={railRef}
          dir="ltr"
          className="overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain touch-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label={t("topBrands")}
        >
          <div className="flex w-max min-w-full items-center justify-center gap-2 px-4 py-1 sm:gap-3 sm:px-3 sm:py-1.5 lg:gap-4">
            {railBrands.map((brand) => {
              const compactLength = brand.label.replace(/[^a-z0-9]/gi, "").length;
              const itemWidth = Math.min(128, Math.max(96, 82 + compactLength * 4));

              return (
                <Link
                  key={brand.slug}
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  role="listitem"
                  aria-label={brand.label}
                  data-featured-brand={brand.slug === strongestSlug ? "true" : undefined}
                  style={{ width: itemWidth }}
                  className="group flex h-14 shrink-0 select-none items-center justify-center overflow-hidden px-1.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.975] motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:px-2 md:hover:-translate-y-[3px] md:hover:scale-[1.11]"
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
        </div>

        {showEdgeHint ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background/90 via-background/35 to-transparent"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background/90 via-background/35 to-transparent"
              aria-hidden="true"
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
