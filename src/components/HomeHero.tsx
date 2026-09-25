import { HeroScene } from "@/components/HeroScene";
import { useEffect, useMemo, useRef, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { localizeHeroSlide, type CmsHeroSlide } from "@/lib/cms";
import { useLanguage } from "@/lib/i18n";

export function HomeHero({
  cmsHeroSlides = [],
}: {
  cmsHeroSlides?: CmsHeroSlide[];
}) {
  const { t, language } = useLanguage();
  const [failedCmsSlideIds, setFailedCmsSlideIds] = useState<string[]>([]);
  const localizedCmsSlides = useMemo(
    () =>
      cmsHeroSlides
        .filter((slide) => Boolean(slide.image_url) && !failedCmsSlideIds.includes(slide.id))
        .map((slide) => localizeHeroSlide(slide, language)),
    [cmsHeroSlides, failedCmsSlideIds, language],
  );

  const slideCount = localizedCmsSlides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveIndex((current) => (slideCount ? Math.min(current, slideCount - 1) : 0));
  }, [slideCount]);


  const cmsSlide = localizedCmsSlides[activeIndex] ?? localizedCmsSlides[0];
  const heroSource = cmsSlide ? "supabase-cms" : "placeholder";

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
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
            setActiveIndex(
              (index) => (index + (dx < 0 ? 1 : -1) + slideCount) % slideCount,
            );
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
            className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center sm:bottom-3"
            aria-label={language === "ar" ? "شرائح الهيرو" : "Hero slides"}
          >
            <div className="pointer-events-auto flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-slate-950/45 px-1.5 py-1 shadow-sm backdrop-blur-md">
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full text-lg text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={language === "ar" ? "الشريحة السابقة" : "Previous slide"}
                onClick={() =>
                  setActiveIndex((index) => (index - 1 + slideCount) % slideCount)
                }
              >
                ‹
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain">
                {Array.from({ length: slideCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={
                      language === "ar"
                        ? `عرض صورة الهيرو ${index + 1}`
                        : `Show hero image ${index + 1}`
                    }
                    aria-current={index === activeIndex ? "true" : undefined}
                    className="grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        index === activeIndex
                          ? "h-1.5 w-4 rounded-full bg-white"
                          : "size-1.5 rounded-full bg-white/55"
                      }
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-lg text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={language === "ar" ? "الشريحة التالية" : "Next slide"}
                onClick={() =>
                  setActiveIndex((index) => (index + 1) % slideCount)
                }
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}

