import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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

function cmsHeroHref(slide: CmsHeroSlide) {
  if (!slide.target_value) return undefined;
  if (slide.target_type === "product") return `/product/${slide.target_value}`;
  if (slide.target_type === "collection") return `/collections/${slide.target_value}`;
  if (slide.target_type === "url") return slide.target_value;
  return undefined;
}

function cmsButtonClass(style: CmsHeroSlide["button_style"]) {
  if (style === "light") return "bg-white text-slate-950 hover:bg-white/90";
  if (style === "dark") return "bg-slate-950 text-white hover:bg-slate-900";
  if (style === "secondary") {
    return "border border-white/70 bg-white/10 text-white backdrop-blur-md hover:bg-white/20";
  }
  return "bg-primary text-primary-foreground hover:bg-primary/90";
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
  const slideCount = usingCms ? localizedCmsSlides.length : shopifySlides.length;
  const [activeIndex, setActiveIndex] = useState(0);

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

  const cmsSlide = usingCms
    ? localizedCmsSlides[activeIndex] ?? localizedCmsSlides[0]
    : undefined;

  const shopifySlide = !usingCms
    ? shopifySlides[activeIndex] ?? shopifySlides[0]
    : undefined;
  const shopifyImage = shopifySlide?.image;
  const shopifyImageActive = Boolean(
    shopifySlide && shopifyImage && failedShopifySlideId !== shopifySlide.id,
  );

  const heroFallbackProduct = effectiveHeroCollection?.products.find((product) =>
    Boolean(product.node.images.edges[0]?.node.url),
  );
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

  const cmsDesktopAlt =
    (language === "ar" ? cmsSlide?.image_alt_ar : cmsSlide?.image_alt_en) ||
    cmsSlide?.title ||
    "Space Call";
  const cmsMobileAlt =
    (language === "ar" ? cmsSlide?.mobile_image_alt_ar : cmsSlide?.mobile_image_alt_en) ||
    cmsDesktopAlt;

  const cmsPicture = cmsSlide ? (
    <picture>
      {cmsSlide.mobile_image_url ? (
        <source media="(max-width: 639px)" srcSet={cmsSlide.mobile_image_url} />
      ) : null}
      <img
        key={`${cmsSlide.id}:${cmsSlide.image_url}`}
        src={cmsSlide.image_url}
        alt={cmsSlide.mobile_image_url ? cmsMobileAlt : cmsDesktopAlt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        onError={() =>
          setFailedCmsSlideIds((current) =>
            current.includes(cmsSlide.id) ? current : [...current, cmsSlide.id],
          )
        }
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    </picture>
  ) : null;

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

  const cmsHref = cmsSlide ? cmsHeroHref(cmsSlide) : undefined;
  const cmsAlignment =
    cmsSlide?.content_alignment === "center"
      ? "items-center text-center"
      : cmsSlide?.content_alignment === "end"
        ? "items-end text-end"
        : "items-start text-start";
  const cmsOverlayOpacity = Math.max(0, Math.min(90, cmsSlide?.overlay_opacity ?? 20)) / 100;

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-source={heroSource}
        data-hero-id={cmsSlide?.id}
        data-hero-handle={
          cmsSlide
            ? `cms:${cmsSlide.id}`
            : shopifySlide?.handle ?? heroFallbackProduct?.node.handle ?? "none"
        }
        data-hero-collection-handle={shopifySlide?.handle}
        className="relative isolate aspect-[16/9] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:aspect-auto sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border lg:min-h-[28rem]"
      >
        {cmsPicture ? (
          <div
            data-testid="home-hero-media"
            aria-label={cmsSlide?.title ?? "Space Call"}
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            {cmsPicture}
          </div>
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

        {cmsSlide ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-black"
              style={{ opacity: cmsOverlayOpacity }}
              aria-hidden="true"
            />
            <div
              data-testid="home-hero-content"
              className={`absolute inset-0 z-[3] flex flex-col justify-end p-5 text-white sm:p-8 lg:p-10 ${cmsAlignment}`}
              dir={language === "ar" ? "rtl" : "ltr"}
            >
              <div className="max-w-2xl">
                {cmsSlide.title ? (
                  <h2 className="text-2xl font-black tracking-tight drop-shadow sm:text-4xl lg:text-5xl">
                    {cmsSlide.title}
                  </h2>
                ) : null}
                {cmsSlide.subtitle ? (
                  <p className="mt-2 max-w-xl text-sm font-medium text-white/90 drop-shadow sm:text-base lg:text-lg">
                    {cmsSlide.subtitle}
                  </p>
                ) : null}
                {cmsHref && cmsSlide.button_label ? (
                  <a
                    href={cmsHref}
                    target={cmsSlide.open_in_new_tab ? "_blank" : undefined}
                    rel={cmsSlide.open_in_new_tab ? "noopener noreferrer" : undefined}
                    className={`press mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg transition ${cmsButtonClass(cmsSlide.button_style)}`}
                  >
                    {cmsSlide.button_label}
                  </a>
                ) : null}
              </div>
            </div>
          </>
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
