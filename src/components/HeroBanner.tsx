import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useLanguage } from "@/lib/i18n";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import type { ShopifyCollection, ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

/**
 * Compact visual hero: dark rounded stage with a centered product image only —
 * no text overlays. Each slide links to its product. Content is Shopify-only.
 */
export function HeroBanner({
  products,
  campaign: _campaign,
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

            return (
              <CarouselItem
                key={node.id}
                className="pl-0"
                aria-label={`${slideIndex + 1} ${t("ofLabel")} ${slides.length}`}
                aria-hidden={slideIndex !== index}
                inert={slideIndex !== index}
              >
                <Link
                  to="/product/$handle"
                  params={{ handle: node.handle }}
                  aria-label={node.title}
                  className="relative grid h-44 place-items-center px-6 py-4 sm:h-52 md:h-60"
                >
                  {image ? (
                    <img
                      src={cdnImage(image.url, 900)}
                      srcSet={cdnSrcSet(image.url, 900)}
                      sizes="(min-width: 768px) 560px, 88vw"
                      alt={image.altText ?? node.title}
                      fetchPriority={slideIndex === 0 ? "high" : "auto"}
                      loading={slideIndex === 0 ? "eager" : "lazy"}
                      decoding={slideIndex === 0 ? "sync" : "async"}
                      width={900}
                      height={900}
                      className="h-full w-auto max-w-full object-contain drop-shadow-2xl"
                    />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center rounded-2xl bg-white/5 text-sm text-hero-muted"
                      role="img"
                      aria-label={t("galleryEmpty")}
                    >
                      {t("galleryEmpty")}
                    </div>
                  )}
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {slides.length > 1 && (
          <div className="flex items-center gap-3 px-5 pb-3 md:px-8 md:pb-4">
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
                className="grid h-9 w-9 place-items-center rounded-full border border-hero-border hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label={t("nextSlide")}
                className="grid h-9 w-9 place-items-center rounded-full border border-hero-border hover:bg-white/10"
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
