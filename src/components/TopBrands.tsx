import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { orderedBrands } from "@/lib/homeMerchandising";
import { useLanguage } from "@/lib/i18n";

type EdgeState = {
  left: boolean;
  right: boolean;
};

const COMPACT_MARKS = new Set(["apple", "xiaomi"]);

function brandSlotWidth(brand: ShopifyBrand) {
  if (COMPACT_MARKS.has(brand.slug)) return 78;

  const compactLength = brand.label.replace(/[^a-z0-9]/gi, "").length;
  return Math.min(122, Math.max(88, 72 + compactLength * 5));
}

/**
 * Premium, minimal brand strip for the homepage.
 *
 * The strongest brand opens in the visual center. The next strongest brands
 * are distributed immediately around it, so ranking is perceived from the
 * center outward while users can still freely swipe in both directions.
 *
 * Logo scaling happens inside a clipped slot rather than scaling the whole
 * link, which keeps the hover animation premium without ever overlapping the
 * neighboring brand.
 */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  const railRef = useRef<HTMLDivElement>(null);
  const visualFrameRef = useRef<number | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>();
  const [edges, setEdges] = useState<EdgeState>({ left: false, right: false });

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
  const brandSignature = railBrands.map((brand) => brand.slug).join("|");

  const measureRail = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const epsilon = 3;
    const nextEdges = {
      left: maxScroll > epsilon && rail.scrollLeft > epsilon,
      right: maxScroll > epsilon && rail.scrollLeft < maxScroll - epsilon,
    };

    setEdges((current) =>
      current.left === nextEdges.left && current.right === nextEdges.right
        ? current
        : nextEdges,
    );

    const railRect = rail.getBoundingClientRect();
    const railCenter = railRect.left + railRect.width / 2;
    let nearestSlug: string | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    rail.querySelectorAll<HTMLElement>("[data-brand-slug]").forEach((item) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSlug = item.dataset.brandSlug;
      }
    });

    if (nearestSlug) {
      setActiveSlug((current) => (current === nearestSlug ? current : nearestSlug));
    }
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (visualFrameRef.current !== null) return;

    visualFrameRef.current = window.requestAnimationFrame(() => {
      visualFrameRef.current = null;
      measureRail();
    });
  }, [measureRail]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !strongestSlug) return;

    const centerStrongestBrand = () => {
      const target = rail.querySelector<HTMLElement>(`[data-featured-brand="true"]`);
      if (!target) return;

      const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (maxScroll <= 0) {
        rail.scrollLeft = 0;
        measureRail();
        return;
      }

      const railRect = rail.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetCenterInContent =
        rail.scrollLeft + (targetRect.left - railRect.left) + targetRect.width / 2;
      const centeredLeft = targetCenterInContent - rail.clientWidth / 2;

      rail.scrollTo({
        left: Math.min(maxScroll, Math.max(0, centeredLeft)),
        behavior: "auto",
      });
      measureRail();
    };

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(centerStrongestBrand);
      rail.dataset.centerFrame = String(secondFrame);
    });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleMeasure())
        : undefined;
    resizeObserver?.observe(rail);
    const track = rail.firstElementChild;
    if (track instanceof HTMLElement) resizeObserver?.observe(track);
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      const secondFrame = Number(rail.dataset.centerFrame);
      if (Number.isFinite(secondFrame)) window.cancelAnimationFrame(secondFrame);
      delete rail.dataset.centerFrame;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (visualFrameRef.current !== null) {
        window.cancelAnimationFrame(visualFrameRef.current);
        visualFrameRef.current = null;
      }
    };
  }, [brandSignature, measureRail, scheduleMeasure, strongestSlug]);

  if (!railBrands.length) return null;

  return (
    <section
      aria-labelledby="top-brands"
      data-testid="top-brands"
      className="-mt-2 -mb-4 sm:-mb-5"
    >
      <div className="home-section-header !mb-0 flex-nowrap items-end">
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

      <div className="relative -mx-3 overflow-hidden sm:mx-0">
        <div
          ref={railRef}
          dir="ltr"
          onScroll={scheduleMeasure}
          className="overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain touch-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label={t("topBrands")}
        >
          <div className="flex w-max min-w-full items-center justify-center gap-1.5 px-3 py-0.5 sm:gap-2.5 sm:px-2 sm:py-1 lg:gap-3">
            {railBrands.map((brand) => {
              const isActive = brand.slug === activeSlug;

              return (
                <Link
                  key={brand.slug}
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  role="listitem"
                  aria-label={brand.label}
                  data-brand-slug={brand.slug}
                  data-featured-brand={brand.slug === strongestSlug ? "true" : undefined}
                  style={{ width: brandSlotWidth(brand) }}
                  className="group flex h-12 shrink-0 select-none items-center justify-center overflow-hidden px-1 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none sm:h-14 sm:px-1.5 md:hover:-translate-y-0.5"
                >
                  <span
                    className={`pointer-events-none flex h-full w-full items-center justify-center transition-[transform,opacity,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.075] group-hover:opacity-100 group-hover:saturate-100 group-hover:drop-shadow-sm ${
                      isActive
                        ? "scale-[1.035] opacity-100 saturate-100"
                        : "scale-100 opacity-[0.88] saturate-[0.94]"
                    }`}
                  >
                    <BrandLogo
                      slug={brand.slug}
                      label={brand.label}
                      size={36}
                      wordmark
                      frameless
                      normalizeForRail
                      className="max-w-full"
                      {...(brand.image ? { imageUrl: brand.image } : {})}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {edges.left ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background/92 via-background/38 to-transparent transition-opacity"
            aria-hidden="true"
          />
        ) : null}
        {edges.right ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background/92 via-background/38 to-transparent transition-opacity"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </section>
  );
}
