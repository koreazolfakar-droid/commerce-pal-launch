import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useLanguage } from "@/lib/i18n";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { productCompareAt, productPrimaryVariant } from "@/lib/productPricing";
import {
  discountPercent,
  formatPrice,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import { resolveBrand } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * Editorial "featured drop" hero: dark stage, oversized wordmark-style title,
 * product cut-out on a soft halo, single primary action. Content is Shopify-only.
 */
export function HeroBanner({
  products,
  campaign,
}: {
  products: ShopifyProduct[];
  campaign?: ShopifyCollection | null | undefined;
}) {
  const { direction, t } = useLanguage();
  const slides = products.slice(0, 5);
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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
    if (!api || slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) api.scrollNext();
    }, 6500);
    return () => window.clearInterval(timer);
  }, [api, paused, reducedMotion, slides.length]);

  if (!slides.length) return null;

  return (
    <section aria-label={t("featuredCarousel")} data-testid="hero-banner" className="px-4">
      <Carousel
        setApi={setApi}
        opts={{ loop: slides.length > 1, direction }}
        aria-label={t("featuredCarousel")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
        className="relative overflow-hidden rounded-[28px] bg-hero text-hero-foreground"
      >
        <CarouselContent className="ml-0 items-stretch">
          {slides.map((product, slideIndex) => {
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
              tag("hero_eyebrow:") ||
              campaign?.title ||
              brand?.label ||
              node.productType ||
              t("featuredTechnology");
            const cta = tag("hero_cta:") || t("shopNow");
            const watermark = (brand?.label ?? node.title).slice(0, 8);

            return (
              <CarouselItem
                key={node.id}
                className="pl-0"
                aria-label={`${slideIndex + 1} ${t("ofLabel")} ${slides.length}`}
                aria-hidden={slideIndex !== index}
                inert={slideIndex !== index}
              >
                <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden px-5 pb-5 pt-6 sm:min-h-[460px] md:min-h-[500px] md:px-10 md:pb-8 md:pt-9">
                  {/* Oversized watermark behind the product, editorial style. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-1/4 select-none text-center text-[26vw] font-black uppercase leading-none tracking-tighter text-hero-foreground/[0.06] md:text-[13rem]"
                  >
                    {watermark}
                  </span>

                  <div className="relative flex items-center gap-2.5">
                    {brand && (
                      <BrandLogo
                        slug={brand.slug}
                        label={brand.label}
                        size={30}
                        className="rounded-xl bg-white p-1"
                      />
                    )}
                    <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.18em] text-hero-muted">
                      {eyebrow}
                    </span>
                    {discount !== null && (
                      <span className="ms-auto rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black text-destructive-foreground">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  <div className="relative my-4 grid flex-1 place-items-center">
                    {image ? (
                      <img
                        src={cdnImage(image.url, 900)}
                        srcSet={cdnSrcSet(image.url, 900)}
                        sizes="(min-width: 1024px) 520px, 88vw"
                        alt={image.altText ?? node.title}
                        fetchPriority={slideIndex === 0 ? "high" : "auto"}
                        loading={slideIndex === 0 ? "eager" : "lazy"}
                        decoding={slideIndex === 0 ? "sync" : "async"}
                        width={900}
                        height={900}
                        className="h-44 w-auto max-w-full object-contain drop-shadow-2xl sm:h-52 md:h-64"
                      />
                    ) : (
                      <div
                        className="grid h-44 w-full place-items-center rounded-2xl bg-white/5 text-sm text-hero-muted"
                        role="img"
                        aria-label={t("galleryEmpty")}
                      >
                        {t("galleryEmpty")}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <h2 className="max-w-[22ch] break-words text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl md:text-5xl">
                      {node.title}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <bdi className="text-2xl font-black sm:text-3xl">
                        {formatPrice(price.amount, price.currencyCode)}
                      </bdi>
                      {discount !== null && compareAt && (
                        <bdi className="text-sm text-hero-muted line-through">
                          {formatPrice(compareAt, price.currencyCode)}
                        </bdi>
                      )}
                      <Link
                        to="/product/$handle"
                        params={{ handle: node.handle }}
                        className="press ms-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:brightness-110"
                      >
                        <span className="min-w-0 truncate">{cta}</span>
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {slides.length > 1 && (
          <div className="flex items-center gap-3 px-5 pb-4 md:px-10 md:pb-6">
            <div className="flex items-center gap-1.5">
              {slides.map((slide, dot) => (
                <button
                  key={slide.node.id}
                  type="button"
                  onClick={() => api?.scrollTo(dot)}
                  aria-label={`${t("showSlide")} ${slide.node.title}`}
                  aria-current={dot === index ? "true" : undefined}
                  className="grid h-8 w-6 place-items-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      dot === index ? "w-7 bg-hero-foreground" : "w-1.5 bg-hero-muted",
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                aria-label={t("previousSlide")}
                className="grid h-10 w-10 place-items-center rounded-full border border-hero-border hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label={t("nextSlide")}
                className="grid h-10 w-10 place-items-center rounded-full border border-hero-border hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </Carousel>
    </section>
  );
}
