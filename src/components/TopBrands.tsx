import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { StoreBrand } from "@/lib/brandDirectory";
import { orderedBrands } from "@/lib/homeMerchandising";
import { localizeSection } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";

const AUTO_SCROLL_ENABLED = false;
const AUTO_SCROLL_PX_PER_SECOND = 24;
const AUTO_SCROLL_START_DELAY_MS = 5000;
const ACTIVE_MEASURE_INTERVAL_MS = 160;
const INFINITE_CYCLES = [0, 1, 2] as const;

/** Reserves a compact, bounded rail slot while allowing longer wordmarks a little more room. */
function brandSlotWidth(brand: StoreBrand) {
  const compactLength = brand.label.replace(/[^a-z0-9]/gi, "").length;
  return Math.min(118, Math.max(104, 96 + compactLength * 2));
}

/**
 * Premium infinite brand selector for the homepage.
 *
 * Performance notes:
 * - auto-scroll waits until the critical startup window has passed;
 * - auto-scroll only mutates scrollLeft inside requestAnimationFrame;
 * - cycle width is cached instead of forcing layout every frame;
 * - active-brand detection is throttled and uses elementFromPoint instead of
 *   measuring every duplicated logo on every scroll frame;
 * - animation pauses while the rail is outside the viewport or while the user
 *   interacts with it.
 */
export function TopBrands({ brands }: { brands: StoreBrand[] }) {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const cmsSection = cms?.sections.find(
    (section) => section.page_slug === "home" && section.section_key === "brands",
  );
  const cmsTitle = cmsSection ? localizeSection(cmsSection, language).title?.trim() : "";
  const sectionTitle = cmsTitle || t("topBrands");
  const railRef = useRef<HTMLDivElement>(null);
  const autoFrameRef = useRef<number | null>(null);
  const measureTimerRef = useRef<number | null>(null);
  const cycleWidthRef = useRef(0);
  const autoPositionRef = useRef(0);
  const inViewportRef = useRef(true);
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
    const left: StoreBrand[] = [];
    const right: StoreBrand[] = [];

    rankedBrands.slice(1).forEach((brand, index) => {
      const storefrontRank = index + 2;
      if (storefrontRank % 2 === 0) right.push(brand);
      else left.push(brand);
    });

    return [...left.reverse(), strongest, ...right];
  }, [rankedBrands]);

  const strongestSlug = rankedBrands[0]?.slug;
  const brandSignature = railBrands.map((brand) => brand.slug).join("|");

  const refreshCycleWidth = useCallback(() => {
    const rail = railRef.current;
    const cycle = rail?.querySelector<HTMLElement>('[data-brand-cycle="0"]');
    cycleWidthRef.current = cycle?.offsetWidth ?? 0;
    return cycleWidthRef.current;
  }, []);

  const recycleInfinitePosition = useCallback((candidate?: number) => {
    const rail = railRef.current;
    const width = cycleWidthRef.current;
    if (!rail || width <= 0) return candidate ?? rail?.scrollLeft ?? 0;

    let next = candidate ?? rail.scrollLeft;

    // Keep the viewport around the middle copy. Moving by exactly one complete
    // cycle is visually identical, so the recycle is imperceptible.
    if (next >= width * 2) next -= width;
    else if (next < width * 0.5) next += width;

    if (Math.abs(rail.scrollLeft - next) > 0.01) rail.scrollLeft = next;
    return next;
  }, []);

  const measureActiveBrand = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const railRect = rail.getBoundingClientRect();
    const centerX = railRect.left + railRect.width / 2;
    const centerY = railRect.top + railRect.height / 2;
    const samples = [0, -10, 10, -20, 20];

    let active: HTMLElement | null = null;
    for (const offset of samples) {
      const hit = document.elementFromPoint(centerX + offset, centerY);
      const candidate =
        hit instanceof Element ? hit.closest<HTMLElement>("[data-brand-slug]") : null;
      if (candidate && rail.contains(candidate)) {
        active = candidate;
        break;
      }
    }

    const slug = active?.dataset["brandSlug"];
    if (slug) setActiveSlug((current) => (current === slug ? current : slug));
  }, []);

  const scheduleMeasure = useCallback(
    (delay = ACTIVE_MEASURE_INTERVAL_MS) => {
      if (measureTimerRef.current !== null) return;

      measureTimerRef.current = window.setTimeout(() => {
        measureTimerRef.current = null;
        measureActiveBrand();
      }, delay);
    },
    [measureActiveBrand],
  );

  const pauseAfterInteraction = useCallback((delay = 1400) => {
    interactionRef.current.resumeAt = performance.now() + delay;
  }, []);

  const handleRailScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    autoPositionRef.current = recycleInfinitePosition();
    scheduleMeasure();
  }, [recycleInfinitePosition, scheduleMeasure]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !strongestSlug || railBrands.length === 0) return;

    const centerStrongestBrand = () => {
      refreshCycleWidth();

      const target = rail.querySelector<HTMLElement>(
        `[data-brand-cycle="1"] [data-featured-brand="true"]`,
      );
      if (!target) return;

      const railRect = rail.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetCenterInContent =
        rail.scrollLeft + (targetRect.left - railRect.left) + targetRect.width / 2;

      const centered = Math.max(0, targetCenterInContent - rail.clientWidth / 2);
      rail.scrollLeft = centered;
      autoPositionRef.current = centered;

      // Do not immediately read layout after writing scrollLeft. Lighthouse was
      // correctly flagging this pattern as forced reflow. The active-logo read is
      // delayed until the browser has had time to commit the new scroll position.
      scheduleMeasure(48);
    };

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(centerStrongestBrand);
      rail.dataset["centerFrame"] = String(secondFrame);
    });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            refreshCycleWidth();
            autoPositionRef.current = recycleInfinitePosition();
            scheduleMeasure(40);
          })
        : undefined;
    resizeObserver?.observe(rail);
    const track = rail.firstElementChild;
    if (track instanceof HTMLElement) resizeObserver?.observe(track);

    const visibilityObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              inViewportRef.current = entry?.isIntersecting ?? true;
            },
            { rootMargin: "100px 0px" },
          )
        : undefined;
    visibilityObserver?.observe(rail);

    const handleResize = () => {
      refreshCycleWidth();
      scheduleMeasure(40);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      const secondFrame = Number(rail.dataset["centerFrame"]);
      if (Number.isFinite(secondFrame)) window.cancelAnimationFrame(secondFrame);
      delete rail.dataset["centerFrame"];
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [
    brandSignature,
    measureActiveBrand,
    railBrands.length,
    recycleInfinitePosition,
    refreshCycleWidth,
    scheduleMeasure,
    strongestSlug,
  ]);

  useEffect(() => {
    if (!AUTO_SCROLL_ENABLED) return;
    const rail = railRef.current;
    if (!rail || railBrands.length < 2) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let lastActiveMeasure = previousTime;
    let startTimer: number | null = null;

    autoPositionRef.current = rail.scrollLeft;

    const animate = (now: number) => {
      const elapsed = Math.min(40, now - previousTime);
      previousTime = now;

      const interaction = interactionRef.current;
      const paused =
        reduceMotion.matches ||
        !inViewportRef.current ||
        interaction.hovered ||
        interaction.focused ||
        interaction.pointerHeld ||
        now < interaction.resumeAt;

      if (paused) {
        // Keep the fractional accumulator synchronized with any manual swipe so
        // resuming never jumps back to an old auto-scroll position.
        autoPositionRef.current = rail.scrollLeft;
      } else {
        autoPositionRef.current += (AUTO_SCROLL_PX_PER_SECOND * elapsed) / 1000;
        autoPositionRef.current = recycleInfinitePosition(autoPositionRef.current);

        // Keep React/layout work far below the animation frame rate. The rail
        // movement stays 60fps, while active-logo detection runs only a few
        // times per second.
        if (now - lastActiveMeasure >= ACTIVE_MEASURE_INTERVAL_MS) {
          lastActiveMeasure = now;
          scheduleMeasure(0);
        }
      }

      autoFrameRef.current = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (reduceMotion.matches) return;
      previousTime = performance.now();
      lastActiveMeasure = previousTime;
      autoPositionRef.current = rail.scrollLeft;
      autoFrameRef.current = window.requestAnimationFrame(animate);
    };

    // The animation is purely decorative. Keep its continuous 60fps work out of
    // the initial load/TBT window, then restore the same movement automatically.
    startTimer = window.setTimeout(startAnimation, AUTO_SCROLL_START_DELAY_MS);

    return () => {
      if (startTimer !== null) window.clearTimeout(startTimer);
      if (autoFrameRef.current !== null) {
        window.cancelAnimationFrame(autoFrameRef.current);
        autoFrameRef.current = null;
      }
    };
  }, [brandSignature, railBrands.length, recycleInfinitePosition, scheduleMeasure]);

  useEffect(
    () => () => {
      if (measureTimerRef.current !== null) {
        window.clearTimeout(measureTimerRef.current);
        measureTimerRef.current = null;
      }
    },
    [],
  );

  if (!railBrands.length) return null;

  return (
    <section aria-labelledby="top-brands" data-testid="top-brands" className="-mt-2 -mb-4 min-w-0 max-w-full overflow-x-hidden sm:-mb-5">
      <div className="home-section-header !mb-0 flex-nowrap items-end">
        <div className="min-w-0 flex-1">
          <h2 id="top-brands" className="text-xl font-bold tracking-[-0.02em]">
            {sectionTitle}
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
          onScroll={handleRailScroll}
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
          aria-label={sectionTitle}
        >
          <div className="flex w-max items-center py-0.5 sm:py-1">
            {INFINITE_CYCLES.map((cycleIndex) => (
              <div
                key={cycleIndex}
                data-brand-cycle={cycleIndex}
                className="flex shrink-0 items-center gap-3 px-1.5 sm:gap-4 sm:px-2 lg:gap-5"
                style={{ contain: "layout paint" }}
                aria-hidden={cycleIndex === 1 ? undefined : true}
              >
                {railBrands.map((brand) => {
                  const isActive = brand.slug === activeSlug;
                  const isFeatured = brand.slug === strongestSlug;
                  const isHighlighted = isActive || (!activeSlug && isFeatured);
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
                      data-featured-brand={isFeatured ? "true" : undefined}
                      data-brand-highlighted={isHighlighted ? "true" : undefined}
                      style={{ width: brandSlotWidth(brand) }}
                      onClick={() => {
                        interactionRef.current.resumeAt = Number.POSITIVE_INFINITY;
                      }}
                      className="group flex h-14 shrink-0 select-none items-center justify-center overflow-hidden px-1 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:px-1.5 md:hover:-translate-y-0.5"
                    >
                      <span
                        className={`pointer-events-none flex h-full w-full items-center justify-center transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.06] group-hover:opacity-100 ${
                          isHighlighted
                            ? "scale-[1.10] opacity-100"
                            : "scale-100 opacity-[0.78] sm:opacity-[0.84]"
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
