import { HeroScene } from "@/components/HeroScene";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { localizeHeroSlide, type CmsHeroSlide } from "@/lib/cms";
import { homepageHeroCollections } from "@/lib/homeMerchandising";
import { useLanguage } from "@/lib/i18n";
import { collectionsQueryOptions } from "@/lib/queries";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";

type HomeHeroCollection =
  | {
      collection: ShopifyCollection;
      products: ShopifyProduct[];
    }
  | null
  | undefined;

const HERO_ROTATION_MS = 8000;
const HERO_AUTO_ROTATION_ENABLED = false;
const SHOPIFY_CDN = /cdn\.shopify\.com|shopifycdn\.(net|com)/;
const HERO_IMAGE_WIDTHS = [640, 960, 1280, 1600, 1920, 2400, 2880] as const;

function heroCdnImage(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!SHOPIFY_CDN.test(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("width", String(width));
    parsed.searchParams.set("format", "webp");
    parsed.searchParams.set("quality", "88");
    return parsed.toString();
  } catch {
    return url;
  }
}

function heroCdnSrcSet(url: string | undefined): string | undefined {
  if (!url || !SHOPIFY_CDN.test(url)) return undefined;
  return HERO_IMAGE_WIDTHS.map((width) => `${heroCdnImage(url, width)} ${width}w`).join(", ");
}

export function HomeHero({
  heroCollection,
  cmsHeroSlides = [],
}: {
  heroCollection?: HomeHeroCollection;
  cmsHeroSlides?: CmsHeroSlide[];
}) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [failedShopifySlideId, setFailedShopifySlideId] = useState<string>();
  const [failedCmsSlideIds, setFailedCmsSlideIds] = useState<string[]>([]);

  const effectiveHeroCollection = heroCollection?.collection ? heroCollection : undefined;

  const cachedCollections = queryClient.getQueryData<ShopifyCollection[]>(
    collectionsQueryOptions().queryKey,
  );

  const configuredCollections = useMemo(() => {
    const collections = cachedCollections ?? [];
    const primary = effectiveHeroCollection?.collection;
    if (!primary) return collections;

    return [primary, ...collections.filter((collection) => collection.id !== primary.id)];
  }, [cachedCollections, effectiveHeroCollection?.collection]);

  const shopifySlides = useMemo(
    () => homepageHeroCollections(configuredCollections),
    [configuredCollections],
  );

  const localizedCmsSlides = useMemo(
    () =>
      cmsHeroSlides
        .filter((slide) => Boolean(slide.image_url) && !failedCmsSlideIds.includes(slide.id))
        .map((slide) => localizeHeroSlide(slide, language)),
    [cmsHeroSlides, failedCmsSlideIds, language],
  );

  const usingCms = localizedCmsSlides.length > 0;
  // CMS is the only visual source for the storefront hero. Never replay legacy
  // Shopify artwork while CMS is loading or temporarily unavailable.
  const legacyFallbackEnabled = false;
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

  const cmsSlide = usingCms
    ? localizedCmsSlides[activeIndex] ?? localizedCmsSlides[0]
    : undefined;

  const shopifySlide = legacyFallbackEnabled && !usingCms
    ? shopifySlides[activeIndex] ?? shopifySlides[0]
    : undefined;
  const shopifyImage = shopifySlide?.image;
  const shopifyImageActive = Boolean(
    shopifySlide && shopifyImage && failedShopifySlideId !== shopifySlide.id,
  );

  const heroFallbackProduct = legacyFallbackEnabled
    ? effectiveHeroCollection?.products.find((product) =>
        Boolean(product.node.images.edges[0]?.node.url),
      )
    : undefined;
  const heroFallbackImage = heroFallbackProduct?.node.images.edges[0]?.node;

  const heroSource = cmsSlide
    ? "supabase-cms"
    : shopifyImageActive
      ? "shopify-collection"
      : heroFallbackImage && heroFallbackProduct
        ? "hero-product-fallback"
        : "placeholder";

  useEffect(() => {
    if (
      shopifySlide?.id &&
      failedShopifySlideId &&
      shopifySlide.id !== failedShopifySlideId
    ) {
      setFailedShopifySlideId(undefined);
    }
  }, [failedShopifySlideId, shopifySlide?.id]);

  const shopifyHeroPicture =
    shopifyImageActive && shopifyImage && shopifySlide ? (
      <picture>
        <source
          media="(max-width: 639px)"
          srcSet={heroCdnSrcSet(shopifyImage.url)}
          sizes="100vw"
        />
        <img
          key={`${shopifySlide.id}:${shopifyImage.url}`}
          src={heroCdnImage(shopifyImage.url, 1920)}
          srcSet={heroCdnSrcSet(shopifyImage.url)}
          sizes="(min-width: 1440px) 1400px, 100vw"
          alt={shopifyImage.altText ?? shopifySlide.title ?? "Space Call"}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          onError={() => setFailedShopifySlideId(shopifySlide.id)}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </picture>
    ) : null;

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
        data-hero-handle={
          cmsSlide
            ? `cms:${cmsSlide.id}`
            : shopifySlide?.handle ?? heroFallbackProduct?.node.handle ?? "none"
        }
        data-hero-collection-handle={shopifySlide?.handle}
        className={`${cmsSlide ? "relative isolate w-full min-w-0 max-w-full overflow-hidden" : "relative isolate h-[clamp(15rem,62vw,20rem)] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:h-[22rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border md:h-[24rem] lg:h-[28rem] xl:h-[30rem]"}`}
      >
        {cmsSlide ? (
          <HeroScene slide={cmsSlide} language={language} priority={activeIndex === 0} onImageError={() => setFailedCmsSlideIds(current => [...current, cmsSlide.id])} />
        ) : shopifyHeroPicture ? (
          <div
            data-testid="home-hero-media"
            aria-label={shopifySlide?.title ?? "Space Call"}
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            {shopifyHeroPicture}
          </div>
        ) : heroFallbackImage && heroFallbackProduct ? (
          <div
            data-testid="home-hero-media"
            aria-label={heroFallbackProduct.node.title ?? "Space Call"}
            className="absolute inset-0 z-[1] block overflow-hidden bg-white"
          >
            <picture>
              <source
                media="(max-width: 639px)"
                srcSet={heroCdnSrcSet(heroFallbackImage.url)}
                sizes="100vw"
              />
              <img
                key={`${heroFallbackProduct.node.id}:${heroFallbackImage.url}`}
                src={heroCdnImage(heroFallbackImage.url, 1920)}
                srcSet={heroCdnSrcSet(heroFallbackImage.url)}
                sizes="(min-width: 1440px) 1400px, 100vw"
                alt={heroFallbackImage.altText ?? heroFallbackProduct.node.title ?? "Space Call"}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            </picture>
          </div>
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

