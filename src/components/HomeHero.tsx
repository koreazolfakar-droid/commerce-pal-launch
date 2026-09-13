import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { homepageHeroCollections } from "@/lib/homeMerchandising";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

type HomeHeroCollection =
  | {
      collection: ShopifyCollection;
      products: ShopifyProduct[];
    }
  | null
  | undefined;

const HERO_ROTATION_MS = 8000;

export function HomeHero({
  products: _products,
  heroCollection,
}: {
  products: ShopifyProduct[];
  heroCollection?: HomeHeroCollection;
}) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const cachedCollections =
    queryClient.getQueryData<ShopifyCollection[]>(["shopify", "collections"]) ?? [];

  const configuredCollections = useMemo(() => {
    const primary = heroCollection?.collection;
    if (!primary) return cachedCollections;

    // The dedicated homepage-hero query is the source of truth for hero artwork.
    // Always prefer it over a possibly stale copy of the same collection from
    // the general collections cache.
    return [
      primary,
      ...cachedCollections.filter((collection) => collection.id !== primary.id),
    ];
  }, [cachedCollections, heroCollection?.collection]);

  const slides = useMemo(
    () => homepageHeroCollections(configuredCollections),
    [configuredCollections],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((current) => (slides.length ? Math.min(current, slides.length - 1) : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeIndex] ?? slides[0];
  const image = activeSlide?.image;

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-source={activeSlide ? "shopify-collection" : "placeholder"}
        data-hero-handle={activeSlide?.handle ?? "none"}
        data-hero-collection-handle={activeSlide?.handle}
        className="relative isolate aspect-[16/9] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:aspect-auto sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border lg:min-h-[28rem]"
      >
        {image ? (
          <Link
            to="/shop"
            aria-label={activeSlide?.title ?? t("shopNow")}
            data-testid="home-hero-media"
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            <img
              key={activeSlide?.id}
              src={cdnImage(image.url, 1800)}
              srcSet={cdnSrcSet(image.url, 1800)}
              sizes="(max-width: 639px) calc(100vw - 1.5rem), (min-width: 1280px) 1280px, 100vw"
              alt={image.altText ?? activeSlide?.title ?? "Space Call"}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </Link>
        ) : (
          <div
            data-testid="home-hero-media"
            className="absolute inset-0 z-[1] grid place-items-center bg-hero px-6 text-center"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-hero-muted">
                Space Call
              </p>
              <p className="mt-2 text-xl font-black sm:text-3xl">
                {language === "ar" ? "أضف صورة الهيرو من Shopify" : "Add hero artwork from Shopify"}
              </p>
            </div>
          </div>
        )}

        {slides.length > 1 && (
          <div
            data-testid="home-hero-dots"
            className="absolute bottom-3 end-3 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-2 backdrop-blur-md sm:bottom-5 sm:end-5"
            aria-label={language === "ar" ? "شرائح الهيرو" : "Hero slides"}
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={
                  language === "ar"
                    ? `عرض صورة الهيرو ${index + 1}`
                    : `Show hero image ${index + 1}`
                }
                aria-current={index === activeIndex ? "true" : undefined}
                className={
                  index === activeIndex
                    ? "h-2.5 w-6 rounded-full bg-primary transition-all"
                    : "h-2.5 w-2.5 rounded-full bg-white/55 transition-all hover:bg-white/80"
                }
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
