import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { orderedBrands } from "@/lib/homeMerchandising";
import { useLanguage } from "@/lib/i18n";

const COMPACT_MARKS = new Set(["apple", "xiaomi"]);
const AUTO_SCROLL_PX_PER_SECOND = 24;
const INFINITE_CYCLES = [0, 1, 2] as const;

function brandSlotWidth(brand: ShopifyBrand) {
  if (COMPACT_MARKS.has(brand.slug)) return 78;

  const compactLength = brand.label.replace(/[^a-z0-9]/gi, "").length;
  return Math.min(122, Math.max(88, 72 + compactLength * 5));
}

/**
 * Premium infinite brand selector for the homepage.
 *
 * Three identical cycles make the rail visually endless. We start inside the
 * middle cycle and silently recycle the scroll position by one cycle whenever
 * the user/auto-scroll approaches either outer copy. That keeps native touch
 * scrolling intact while avoiding a visible jump.
 *
 * Auto-scroll pauses while the user presses, hovers or focuses the rail and
 * waits briefly after a touch/drag before resuming, making brand selection easy.
 */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  const railRef = useRef<HTMLDivElement>(null);
  const measureFrameRef = useRef<number | null>(null);
  const autoFrameRef = useRef<number | null>(null);
  const interactionRef = useRef({
    hovered: false,
    focused: false,
    pointerHeld: false,
    resumeAt: 0,
  });
  const [activeSlug, setActiveSlug] = useState<string>();

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

  const cycleWidth = useCallback(() => {
    const rail = railRef.current;
    const cycle = rail?.querySelector<HTMLElement>("[data-brand-cycle=\"0\"]");
    return cycle?.offsetWidth ?? 0;
  }, []);

  const recycleInfinitePosition = useCallback(() => {
    const rail = railRef.current;
    const width = cycleWidth();
    if (!rail || width <= 0) return;

    // Stay around the middle copy. Moving exactly one cycle is invisible
    // because all three cycles contain the same ordered brand sequence.
    if (rail.scrollLeft >= width * 2) {
      rail.scrollLeft -= width;
    } else if (rail.scrollLeft < width * 0.5) {
      rail.scrollLeft += width;
    }
  }, [cycleWidth]);

  const measureRail = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    recycleInfinitePosition();

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
  }, [recycleInfinitePosition]);

  const scheduleMeasure = useCallback(() => {
    if (measureFrameRef.current !== null) return;

    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measureRail();
    });
  }, [measureRail]);

  const pauseAfterInteraction = useCallback((delay = 1400) => {
    interactionRef.current.resumeAt = performance.now() + delay;
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !strongestSlug || railBrands.length === 0) return;

    const centerStrongestBrand = () => {
      const target = rail.querySelector<HTMLElement>(
        `[data-brand-cycle="1"] [data-featured-brand="true"]`,
      );
      if (!target) return;

      const railRect = rail.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetCenterInContent =
        rail.scrollLeft + (targetRect.left - railRect.left) + targetRect.width / 2;

      rail.scrollLeft = Math.max(0, targetCenterInContent - rail.clientWidth / 2);
      recycleInfinitePosition();
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
    };
  }, [brandSignature, measureRail, railBrands.length, recycleInfinitePosition, scheduleMeasure, strongestSlug]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || railBrands.length < 2) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();

    const animate = (now: number) => {
      const elapsed = Math.min(64, now - previousTime);
      previousTime = now;

      const interaction = interactionRef.current;
      const paused =
        reduceMotion.matches ||
        interaction.hovered ||
        interaction.focused ||
        interaction.pointerHeld ||
        now < interaction.resumeAt;

      if (!paused) {
        rail.scrollLeft += (AUTO_SCROLL_PX_PER_SECOND * elapsed) / 1000;
        recycleInfinitePosition();
        scheduleMeasure();
      }

      autoFrameRef.current = window.requestAnimationFrame(animate);
    };

    autoFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (autoFrameRef.current !== null) {
        window.cancelAnimationFrame(autoFrameRef.current);
        autoFrameRef.current = null;
      }
    };
  }, [brandSignature, railBrands.length, recycleInfinitePosition, scheduleMeasure]);

  useEffect(
    () => () => {
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    },
    [],
  );

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
          onPointerDown={() => {
            interactionRef.current.pointerHeld = true;
          }}
          onPointerUp={() => {
            interactionRef.current.pointerHeld = false;
            pauseAfterInteraction();
          }}
          onPointerCancel={() => {
            interactionRef.current.pointerHeld = false;
            pauseAfterInteraction();
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") interactionRef.current.hovered = true;
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              interactionRef.current.hovered = false;
              pauseAfterInteraction(450);
            }
          }}
          onFocusCapture={() => {
            interactionRef.current.focused = true;
          }}
          onBlurCapture={(event) => {
            const next = event.relatedTarget;
            if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
              interactionRef.current.focused = false;
              pauseAfterInteraction(650);
            }
          }}
          onWheel={() => pauseAfterInteraction(1200)}
          className="cursor-grab overflow-x-auto overflow-y-hidden overscroll-x-contain touch-auto active:cursor-grabbing [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label={t("topBrands")}
        >
          <div className="flex w-max items-center py-0.5 sm:py-1">
            {INFINITE_CYCLES.map((cycleIndex) => (
              <div
                key={cycleIndex}
                data-brand-cycle={cycleIndex}
                className="flex shrink-0 items-center gap-1 px-1 sm:gap-2 sm:px-1.5 lg:gap-2.5"
                aria-hidden={cycleIndex === 1 ? undefined : true}
              >
                {railBrands.map((brand) => {
                  const isActive = brand.slug === activeSlug;
                  const isPrimaryCycle = cycleIndex === 1;

                  return (
                    <Link
                      key={`${cycleIndex}-${brand.slug}`}
                      to="/brand/$slug"
                      params={{ slug: brand.slug }}
                      role={isPrimaryCycle ? "listitem" : undefined}
                      aria-label={isPrimaryCycle ? brand.label : undefined}
                      tabIndex={isPrimaryCycle ? undefined : -1}
                      data-brand-slug={brand.slug}
                      data-featured-brand={brand.slug === strongestSlug ? "true" : undefined}
                      style={{ width: brandSlotWidth(brand) }}
                      onClick={() => {
                        interactionRef.current.resumeAt = Number.POSITIVE_INFINITY;
                      }}
                      className="group flex h-12 shrink-0 select-none items-center justify-center overflow-hidden px-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none sm:h-14 sm:px-1 md:hover:-translate-y-0.5"
                    >
                      <span
                        className={`pointer-events-none flex h-full w-full items-center justify-center transition-[transform,opacity,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.08] group-hover:opacity-100 group-hover:saturate-100 group-hover:drop-shadow-sm ${
                          isActive
                            ? "scale-[1.04] opacity-100 saturate-100"
                            : "scale-100 opacity-[0.86] saturate-[0.92]"
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
            ))}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-9 bg-gradient-to-r from-background via-background/78 to-transparent"
          style={{ boxShadow: "12px 0 26px -18px rgb(15 23 42 / 0.72)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-9 bg-gradient-to-l from-background via-background/78 to-transparent"
          style={{ boxShadow: "-12px 0 26px -18px rgb(15 23 42 / 0.72)" }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
