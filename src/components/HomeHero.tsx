import { useEffect, useMemo, useRef, useState } from "react";

import { HeroScene } from "@/components/HeroScene";
import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { localizeHeroSlide, type CmsHeroSlide } from "@/lib/cms";
import { useLanguage } from "@/lib/i18n";

const HERO_ROTATION_MS = 8000;

export function HomeHero({
  cmsHeroSlides = [],
}: {
  cmsHeroSlides?: CmsHeroSlide[];
}) {
  const { t, language } = useLanguage();
  const [failedCmsImages, setFailedCmsImages] = useState<Record<string, string>>(
    {},
  );

  const localizedCmsSlides = useMemo(
    () =>
      cmsHeroSlides
        .filter(
          (slide) =>
            Boolean(slide.image_url) &&
            failedCmsImages[slide.id] !== slide.image_url,
        )
        .map((slide) => localizeHeroSlide(slide, language)),
    [cmsHeroSlides, failedCmsImages, language],
  );

  const slideCount = localizedCmsSlides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveIndex((current) =>
      slideCount ? Math.min(current, slideCount - 1) : 0,
    );
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1 || paused || interacting) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slideCount, paused, interacting]);

  const cmsSlide =
    localizedCmsSlides[activeIndex] ?? localizedCmsSlides[0] ?? undefined;
  const heroSource = cmsSlide ? "supabase-cms" : "placeholder";

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setInteracting(false);
          }
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (touch) swipe.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = swipe.current;
          const touch = event.changedTouches[0];
          swipe.current = null;
          if (!start || !touch || slideCount < 2) return;

          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            setPaused(true);
            setActiveIndex(
              (index) =>
                (index + (dx < 0 ? 1 : -1) + slideCount) % slideCount,
            );
          }
        }}
        data-testid="home-hero"
        data-hero-source={heroSource}
        data-hero-id={cmsSlide?.id}
        data-hero-handle={cmsSlide ? `cms:${cmsSlide.id}` : "none"}
        className={
          cmsSlide
            ? "relative isolate w-full min-w-0"
            : "relative isolate h-[clamp(15rem,62vw,20rem)] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:h-[22rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border md:h-[24rem] lg:h-[28rem] xl:h-[30rem]"
        }
      >
        {cmsSlide ? (
          <HeroScene
            slide={cmsSlide}
            language={language}
            priority={activeIndex === 0}
            onImageError={() =>
              setFailedCmsImages((current) => ({
                ...current,
                [cmsSlide.id]: cmsSlide.image_url,
              }))
            }
          />
        ) : (
          <div
            data-testid="home-hero-media"
            aria-hidden="true"
            className="absolute inset-0 z-[1] grid place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8"
          >
            <div className="grid place-items-center rounded-3xl bg-white/95 p-5 shadow-xl">
              <img
                src="/logo.svg"
                alt=""
                className="h-14 w-auto max-w-[15rem] object-contain"
              />
            </div>
          </div>
        )}
      </section>

      {slideCount > 1 && (
        <div
          data-testid="home-hero-dots"
          className="mx-auto mt-2 flex w-full max-w-xl items-center justify-center gap-1 rounded-full border border-border/60 bg-muted/80 px-1.5 py-1 text-foreground shadow-sm backdrop-blur"
          aria-label={language === "ar" ? "شرائح الهيرو" : "Hero slides"}
        >
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-base hover:bg-background/70"
            aria-label={
              language === "ar" ? "الشريحة السابقة" : "Previous slide"
            }
            onClick={() => {
              setPaused(true);
              setActiveIndex(
                (index) => (index - 1 + slideCount) % slideCount,
              );
            }}
          >
            ‹
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: slideCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setPaused(true);
                  setActiveIndex(index);
                }}
                aria-label={
                  language === "ar"
                    ? `عرض صورة الهيرو ${index + 1}`
                    : `Show hero image ${index + 1}`
                }
                aria-current={index === activeIndex ? "true" : undefined}
                className="grid size-10 shrink-0 place-items-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={
                    index === activeIndex
                      ? "h-2 w-5 rounded-full bg-primary transition-all"
                      : "size-2 rounded-full bg-foreground/30 transition-all"
                  }
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-xs hover:bg-background/70"
            aria-label={
              language === "ar"
                ? paused
                  ? "تشغيل الشرائح"
                  : "إيقاف الشرائح"
                : paused
                  ? "Play slides"
                  : "Pause slides"
            }
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>

          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-base hover:bg-background/70"
            aria-label={language === "ar" ? "الشريحة التالية" : "Next slide"}
            onClick={() => {
              setPaused(true);
              setActiveIndex((index) => (index + 1) % slideCount);
            }}
          >
            ›
          </button>
        </div>
      )}

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
