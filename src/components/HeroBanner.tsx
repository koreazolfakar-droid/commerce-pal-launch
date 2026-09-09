import { productPrimaryVariant, productCompareAt } from "@/lib/productPricing";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { FacetHero } from "@/components/FacetHero";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useLanguage } from "@/lib/i18n";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import {
  discountPercent,
  formatPrice,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import { resolveBrand } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/** Product photography and copy occupy separate tracks; long titles can grow safely. */
export function HeroBanner({
  products,
  campaign,
}: {
  products: ShopifyProduct[];
  campaign?: ShopifyCollection | null | undefined;
}) {
  const { direction, t } = useLanguage();
  const campaignSlide = campaign?.image ? campaign : null;
  const offset = campaignSlide ? 1 : 0;
  const slideCount = products.length + offset;
  const dots = [
    ...(campaignSlide ? [{ id: campaignSlide.id, title: campaignSlide.title }] : []),
    ...products.map((product) => product.node),
  ];
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => setIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    if (!api || slideCount < 2 || hovered || focused || manualPause || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) api.scrollNext();
    }, 6500);
    return () => window.clearInterval(timer);
  }, [api, hovered, focused, manualPause, reducedMotion, slideCount]);

  if (!slideCount) return null;

  return (
    <section aria-label={t("featuredCarousel")} data-testid="hero-banner" className="hero-campaign">
      <Carousel
        setApi={setApi}
        opts={{ loop: slideCount > 1, direction }}
        aria-label={t("featuredCarousel")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        className="overflow-hidden rounded-3xl bg-hero text-hero-foreground"
      >
        <CarouselContent className="ml-0 items-stretch">
          {campaignSlide && (
            <CarouselItem
              className="pl-0"
              aria-label={`1 ${t("ofLabel")} ${slideCount}`}
              aria-hidden={index !== 0}
              inert={index !== 0}
            >
              <FacetHero
                id="homepage-campaign-title"
                title={campaignSlide.title}
                description={campaignSlide.description}
                image={campaignSlide.image}
                href={`/collections/${campaignSlide.handle}`}
                eager
              />
            </CarouselItem>
          )}
          {products.map((product, productIndex) => {
            const slideIndex = productIndex + offset;
            const node = product.node;
            const image = node.images.edges[0]?.node;
            const variant = productPrimaryVariant(product);
            const price = variant?.price ?? node.priceRange.minVariantPrice;
            const compareAt = productCompareAt(product);
            const discount = discountPercent(price.amount, compareAt);
            const brand = resolveBrand(product);
            const tag = (prefix: string) =>
              (node.tags ?? [])
                .find((value) => value.toLowerCase().startsWith(prefix))
                ?.slice(prefix.length)
                .trim();
            const eyebrow =
              tag("hero_eyebrow:") || brand?.label || node.productType || t("featuredTechnology");
            const subtitle =
              tag("hero_subtitle:") ||
              (node.description ?? "").trim().split(/(?<=\.)\s/)[0] ||
              t("heroIntroduction");
            const normalize = (value: string) =>
              value
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9\u0600-\u06ff]+/g, "");
            const showSubtitle = Boolean(subtitle) && normalize(subtitle) !== normalize(node.title);
            const cta = tag("hero_cta:") || t("shopNow");
            const badge = tag("hero_badge:");

            return (
              <CarouselItem
                key={node.id}
                className="pl-0"
                aria-label={`${slideIndex + 1} ${t("ofLabel")} ${slideCount}`}
                aria-hidden={slideIndex !== index}
                inert={slideIndex !== index}
              >
                <div className="hero-campaign-slide h-full">
                  <div className="order-2 md:order-1">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {brand && (
                        <BrandLogo
                          slug={brand.slug}
                          label={brand.label}
                          size={32}
                          className="rounded-lg p-1"
                        />
                      )}
                      <span className="min-w-0 break-words text-xs font-bold uppercase tracking-wider text-hero-muted">
                        {eyebrow}
                      </span>
                    </div>
                    {badge && (
                      <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-hero-border px-3 py-1 text-xs font-bold">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="min-w-0 break-words">{badge}</span>
                      </div>
                    )}
                    <h2 className="mt-4 break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                      {node.title}
                    </h2>
                    {showSubtitle && (
                      <p className="mt-3 line-clamp-3 break-words text-base leading-relaxed text-hero-muted">
                        {subtitle}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                      <bdi className="text-2xl font-extrabold sm:text-3xl">
                        {formatPrice(price.amount, price.currencyCode)}
                      </bdi>
                      {discount !== null && compareAt && (
                        <>
                          <bdi className="text-sm text-hero-muted line-through">
                            {formatPrice(compareAt, price.currencyCode)}
                          </bdi>
                          <span className="rounded-full bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
                            -{discount}%
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to="/product/$handle"
                        params={{ handle: node.handle }}
                        className="press inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:brightness-110"
                      >
                        <span className="min-w-0 break-words">{cta}</span>
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                      <Link
                        to="/product/$handle"
                        params={{ handle: node.handle }}
                        className="press inline-flex min-h-11 items-center justify-center rounded-full border border-hero-border px-5 py-3 text-sm font-bold hover:bg-white/10"
                      >
                        {t("fullDetails")}
                      </Link>
                    </div>
                  </div>
                  <div className="order-1 flex min-w-0 items-center justify-center md:order-2">
                    {image ? (
                      <img
                        src={cdnImage(image.url, 1000)}
                        srcSet={cdnSrcSet(image.url, 1000)}
                        sizes="(min-width: 1280px) 540px, (min-width: 768px) 45vw, 85vw"
                        alt={image.altText ?? node.title}
                        fetchPriority={slideIndex === 0 ? "high" : "auto"}
                        loading={slideIndex === 0 ? "eager" : "lazy"}
                        decoding={slideIndex === 0 ? "sync" : "async"}
                        width={1000}
                        height={1000}
                        className="h-52 w-full object-contain sm:h-64 md:h-80 lg:h-96"
                      />
                    ) : (
                      <div
                        className="grid h-52 w-full place-items-center rounded-2xl bg-white/5 text-sm text-hero-muted"
                        role="img"
                        aria-label={t("galleryEmpty")}
                      >
                        {t("galleryEmpty")}
                      </div>
                    )}
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {slideCount > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-hero-border px-3 py-2">
            <button
              type="button"
              onClick={() => api?.scrollPrev()}
              aria-label={t("previousSlide")}
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </button>
            <div className="flex flex-wrap items-center justify-center">
              {dots.map((slide, dot) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => api?.scrollTo(dot)}
                  aria-label={`${t("showSlide")} ${slide.title}`}
                  aria-current={dot === index ? "true" : undefined}
                  className="grid h-11 w-8 place-items-center rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2 rounded-full transition-all",
                      dot === index ? "w-6 bg-white" : "w-2 bg-hero-muted",
                    )}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => api?.scrollNext()}
              aria-label={t("nextSlide")}
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setManualPause((value) => !value)}
              aria-label={manualPause ? t("resumeHero") : t("pauseHero")}
              aria-pressed={manualPause}
              disabled={reducedMotion}
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
            >
              {manualPause ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </Carousel>
    </section>
  );
}
