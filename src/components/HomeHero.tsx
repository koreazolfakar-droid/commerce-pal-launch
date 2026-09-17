import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { localizeHeroSlide, type CmsHeroSlide } from "@/lib/cms";
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

function cmsSlideHref(slide: CmsHeroSlide) {
  if (!slide.target_value || slide.target_type === "none") return null;
  if (slide.target_type === "collection") return `/collections/${slide.target_value}`;
  if (slide.target_type === "product") return `/product/${slide.target_value}`;
  return slide.target_value;
}

export function HomeHero({
  products: _products,
  heroCollection,
  cmsHeroSlides = [],
}: {
  products: ShopifyProduct[];
  heroCollection?: HomeHeroCollection;
  cmsHeroSlides?: CmsHeroSlide[];
}) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const cachedCollections = queryClient.getQueryData<ShopifyCollection[]>([
    "shopify",
    "collections",
  ]);

  const configuredCollections = useMemo(() => {
    const collections = cachedCollections ?? [];
    const primary = heroCollection?.collection;
    if (!primary) return collections;

    return [primary, ...collections.filter((collection) => collection.id !== primary.id)];
  }, [cachedCollections, heroCollection?.collection]);

  const shopifySlides = useMemo(
    () => homepageHeroCollections(configuredCollections),
    [configuredCollections],
  );
  const localizedCmsSlides = useMemo(
    () => cmsHeroSlides.map((slide) => localizeHeroSlide(slide, language)),
    [cmsHeroSlides, language],
  );
  const useCmsSlides = localizedCmsSlides.length > 0;
  const slideCount = useCmsSlides ? localizedCmsSlides.length : shopifySlides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedCmsSlideId, setFailedCmsSlideId] = useState<string>();

  useEffect(() => {
    setActiveIndex((current) => (slideCount ? Math.min(current, slideCount - 1) : 0));
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  const cmsSlide = useCmsSlides
    ? (localizedCmsSlides[activeIndex] ?? localizedCmsSlides[0])
    : undefined;
  const shopifySlide = !useCmsSlides ? (shopifySlides[activeIndex] ?? shopifySlides[0]) : undefined;
  const shopifyImage = shopifySlide?.image;
  const heroFallbackProduct = heroCollection?.products.find(
    (product) => Boolean(product.node.images.edges[0]?.node.url),
  );
  const heroFallbackImage = heroFallbackProduct?.node.images.edges[0]?.node;
  const cmsImageActive = Boolean(cmsSlide && failedCmsSlideId !== cmsSlide.id);
  const cmsHref = cmsSlide ? cmsSlideHref(cmsSlide) : null;
  const heroSource = cmsImageActive
    ? "cms"
    : shopifyImage && shopifySlide
      ? "shopify-collection"
      : heroFallbackImage && heroFallbackProduct
        ? "hero-product-fallback"
        : "placeholder";

  useEffect(() => {
    if (cmsSlide?.id && failedCmsSlideId && cmsSlide.id !== failedCmsSlideId) {
      setFailedCmsSlideId(undefined);
    }
  }, [cmsSlide?.id, failedCmsSlideId]);

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-source={heroSource}
        data-hero-handle={shopifySlide?.handle ?? cmsSlide?.id ?? heroFallbackProduct?.node.handle ?? "none"}
        data-hero-collection-handle={shopifySlide?.handle}
        className="relative isolate aspect-[16/9] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:aspect-auto sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border lg:min-h-[28rem]"
      >
        {cmsSlide && cmsImageActive ? (
          <a
            href={cmsHref ?? undefined}
            aria-label={cmsSlide.title ?? t("shopNow")}
            data-testid="home-hero-media"
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            <picture>
              {cmsSlide.mobile_image_url ? (
                <source media="(max-width: 639px)" srcSet={cmsSlide.mobile_image_url} />
              ) : null}
              <img
                key={cmsSlide.id}
                src={cmsSlide.image_url}
                alt={cmsSlide.title ?? "Space Call"}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
                onError={() => setFailedCmsSlideId(cmsSlide.id)}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </picture>
          </a>
        ) : shopifyImage && shopifySlide ? (
          <Link
            to="/collections/$handle"
            params={{ handle: shopifySlide.handle }}
            aria-label={shopifySlide.title ?? t("shopNow")}
            data-testid="home-hero-media"
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={cdnImage(shopifyImage.url, 480)} />
              <img
                key={shopifySlide.id}
                src={cdnImage(shopifyImage.url, 1440)}
                srcSet={cdnSrcSet(shopifyImage.url, 1440)}
                sizes="(min-width: 1280px) 1280px, 100vw"
                alt={shopifyImage.altText ?? shopifySlide.title ?? "Space Call"}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </picture>
          </Link>
        ) : heroFallbackImage && heroFallbackProduct ? (
          <Link
            to="/product/$handle"
            params={{ handle: heroFallbackProduct.node.handle }}
            aria-label={heroFallbackProduct.node.title ?? t("shopNow")}
            data-testid="home-hero-media"
            className="absolute inset-0 z-[1] block overflow-hidden bg-white"
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={cdnImage(heroFallbackImage.url, 480)} />
              <img
                key={heroFallbackProduct.node.id}
                src={cdnImage(heroFallbackImage.url, 1440)}
                srcSet={cdnSrcSet(heroFallbackImage.url, 1440)}
                sizes="(min-width: 1280px) 1280px, 100vw"
                alt={heroFallbackImage.altText ?? heroFallbackProduct.node.title ?? "Space Call"}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            </picture>
          </Link>
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

        {cmsSlide && cmsImageActive && (cmsSlide.title || cmsSlide.subtitle || cmsSlide.button_label) ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[3] max-w-xl rounded-2xl bg-black/35 p-4 text-white backdrop-blur-sm sm:inset-x-8 sm:bottom-8 sm:p-6">
            {cmsSlide.title ? (
              <h2 className="text-xl font-black sm:text-3xl">{cmsSlide.title}</h2>
            ) : null}
            {cmsSlide.subtitle ? (
              <p className="mt-1 max-w-prose text-sm text-white/85 sm:text-base">
                {cmsSlide.subtitle}
              </p>
            ) : null}
            {cmsSlide.button_label && cmsHref ? (
              <span className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-black sm:text-sm">
                {cmsSlide.button_label}
              </span>
            ) : null}
          </div>
        ) : null}

        {slideCount > 1 && (
          <div
            data-testid="home-hero-dots"
            className="absolute bottom-3 end-3 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-2 backdrop-blur-md sm:bottom-5 sm:end-5"
            aria-label={language === "ar" ? "شرائح الهيرو" : "Hero slides"}
          >
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
