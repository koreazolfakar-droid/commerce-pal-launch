import { HeroScene } from "@/components/HeroScene";
import { useEffect, useMemo, useRef, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { localizeHeroSlide, type CmsHeroSlide } from "@/lib/cms";
import { useLanguage } from "@/lib/i18n";

const HERO_ROTATION_MS = 8000;
const HERO_AUTO_ROTATION_ENABLED = false;
export function HomeHero({
  cmsHeroSlides = [],
}: {
  cmsHeroSlides?: CmsHeroSlide[];
}) {
  const { t, language } = useLanguage();
  const localizedCmsSlides = useMemo(
    () =>
      cmsHeroSlides
        .filter((slide) => Boolean(slide.image_url) && !failedCmsSlideIds.includes(slide.id))
        .map((slide) => localizeHeroSlide(slide, language)),
    [cmsHeroSlides, failedCmsSlideIds, language],
  );

  const slideCount = localizedCmsSlides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveIndex((current) => (slideCount ? Math.min(current, slideCount - 1) : 0));
  }, [slideCount]);

  useEffect(() => {
    if (!HERO_AUTO_ROTATION_ENABLED || slideCount <= 1 || paused || interacting) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slideCount, paused, interacting]);

  const cmsSlide = localizedCmsSlides[activeIndex] ?? localizedCmsSlides[0];
  const heroSource = cmsSlide ? "supabase-cms" : "placeholder";

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
        onTouchStart={event => { const touch = event.touches[0]; if (touch) swipe.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={event => {
          const start = swipe.current, touch = event.changedTouches[0]; swipe.current = null;
          if (!start || !touch || slideCount < 2) return;
          const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            setPaused(true);
            setActiveIndex(index => (index + (dx < 0 ? 1 : -1) + slideCount) % slideCount);
          }
        }}
        data-testid="home-hero"
        data-hero-source={heroSource}
        data-hero-id={cmsSlide?.id}
        data-hero-handle={cmsSlide ? `cms:${cmsSlide.id}` : "none"}
        className={`${cmsSlide ? "relative isolate w-full min-w-0 max-w-full overflow-hidden" : "relative isolate h-[clamp(15rem,62vw,20rem)] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:h-[22rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border md:h-[24rem] lg:h-[28rem] xl:h-[30rem]"}`}
      >
        {cmsSlide ? (
          <HeroScene
            slide={cmsSlide}
            language={language}
            priority={activeIndex === 0}
            onImageError={() =>
              setFailedCmsSlideIds((current) =>
                current.includes(cmsSlide.id) ? current : [...current, cmsSlide.id],
              )
            }
          />
        ) : (
          <div
            data-testid="home-hero-media"
            aria-hidden="true"
            className="absolute inset-0 z-[1] grid place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8"
          >
            <div className="grid place-items-center rounded-3xl bg-white/95 p-5 shadow-xl">
              <img src="/logo.svg" alt="" className="h-14 w-auto max-w-[15rem] object-contain" />
            </div>
          </div>
        )}

        {slideCount > 1 && (
          <div
            data-testid="home-hero-dots"
            className="relative mt-2 flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-muted p-1 text-foreground"
            aria-label={language === "ar" ? "شرائح الهيرو" : "Hero slides"}
          >
            <button type="button" className="min-h-11 min-w-11 rounded-lg px-3" aria-label={language === "ar" ? "الشريحة السابقة" : "Previous slide"} onClick={() => { setPaused(true); setActiveIndex(index => (index - 1 + slideCount) % slideCount); }}>‹</button>
            <button type="button" className="min-h-11 rounded-lg px-3 text-xs" aria-label={language === "ar" ? (paused ? "تشغيل الشرائح" : "إيقاف الشرائح") : (paused ? "Play slides" : "Pause slides")} onClick={() => setPaused(value => !value)}>{language === "ar" ? (paused ? "تشغيل" : "إيقاف") : (paused ? "Play" : "Pause")}</button>
            {Array.from({ length: slideCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => { setPaused(true); setActiveIndex(index); }}
                aria-label={
                  language === "ar"
                    ? `عرض صورة الهيرو ${index + 1}`
                    : `Show hero image ${index + 1}`
                }
                aria-current={index === activeIndex ? "true" : undefined}
                className={
                  index === activeIndex
                    ? "min-h-11 min-w-11 rounded-xl bg-primary text-primary-foreground"
                    : "min-h-11 min-w-11 rounded-xl bg-muted hover:bg-muted/80"
                }
              >{index + 1}</button>
            ))}
            <button type="button" className="min-h-11 min-w-11 rounded-lg px-3" aria-label={language === "ar" ? "الشريحة التالية" : "Next slide"} onClick={() => { setPaused(true); setActiveIndex(index => (index + 1) % slideCount); }}>›</button>
          </div>
        )}
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}

