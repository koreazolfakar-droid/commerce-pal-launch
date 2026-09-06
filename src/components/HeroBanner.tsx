import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Gift } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { discountPercent, formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { resolveBrand } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/** Premium hero card: brand label, headline, bullets, pricing, CTA, carousel dots. */
export function HeroBanner({ products }: { products: ShopifyProduct[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

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
    if (!api || products.length < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => api.scrollNext(), 6500);
    return () => clearInterval(timer);
  }, [api, paused, products.length]);

  const scrollTo = useCallback((slide: number) => api?.scrollTo(slide), [api]);

  if (products.length === 0) return null;

  return (
    <section className="px-4 sm:px-0" aria-label="Featured products">
      <Carousel
        setApi={setApi}
        opts={{ loop: products.length > 1 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="overflow-hidden rounded-3xl border border-hero-border bg-hero text-hero-foreground shadow-float"
      >
        <CarouselContent className="ml-0">
          {products.map((product, slideIndex) => {
            const node = product.node;
            const image = node.images.edges[0]?.node;
            const variant = node.variants.edges[0]?.node;
            const price = variant?.price ?? node.priceRange.minVariantPrice;
            const compareAt = variant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
            const discount = discountPercent(price.amount, compareAt);
            const brand = resolveBrand(product);
            const summary = (node.description ?? "").trim().split(/(?<=\.)\s/)[0];
            const gift = (node.tags ?? []).find((tag) => /free\s|gift|bundle/i.test(tag));
            return (
              <CarouselItem key={node.id} className="pl-0">
                <div className="relative grid items-center gap-4 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 lg:p-12">
                  <div className="order-2 min-w-0 md:order-1">
                    <div className="flex items-center gap-2">
                      {brand && <BrandLogo slug={brand.slug} label={brand.label} size={24} />}
                      <span className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{brand?.label ?? node.productType ?? "Featured"}</span>
                    </div>
                    {slideIndex === 0 ? (
                      <h1 className="mt-2.5 line-clamp-2 max-w-xl text-xl font-extrabold leading-[1.15] sm:text-3xl lg:text-4xl">{node.title}</h1>
                    ) : (
                      <h2 className="mt-2.5 line-clamp-2 max-w-xl text-xl font-extrabold leading-[1.15] sm:text-3xl lg:text-4xl">{node.title}</h2>
                    )}
                    {summary && (
                      <p className="mt-2 line-clamp-2 max-w-md text-[13px] text-hero-muted">{summary}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-xl font-extrabold text-primary sm:text-2xl">{formatPrice(price.amount, price.currencyCode)}</span>
                      {discount !== null && compareAt && <><span className="text-sm text-hero-muted line-through">{formatPrice(compareAt, price.currencyCode)}</span><span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">-{discount}%</span></>}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <Link to="/product/$handle" params={{ handle: node.handle }} className="press inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card-hover hover:opacity-90">Shop now <ArrowRight className="h-4 w-4" /></Link>
                      <Link to="/product/$handle" params={{ handle: node.handle }} className="press inline-flex items-center gap-1.5 rounded-full border border-hero-border px-4 py-3 text-[13px] font-semibold text-hero-muted transition-colors hover:text-hero-foreground">View details</Link>
                    </div>
                  </div>
                  <Link to="/product/$handle" params={{ handle: node.handle }} aria-label={node.title} className="group relative order-1 block md:order-2">
                    {/* Subtle lighting behind the product, no heavy effects. */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
                    />
                    {image && (
                      <div className="relative overflow-hidden rounded-[2rem] bg-white p-3 shadow-float ring-1 ring-white/15 md:p-5">
                      <img
                        src={cdnImage(image.url, 720)}
                        srcSet={cdnSrcSet(image.url, 720)}
                        sizes="(min-width: 1024px) 520px, 80vw"
                        alt={image.altText ?? node.title}
                        fetchPriority={slideIndex === 0 ? "high" : "auto"}
                        loading={slideIndex === 0 ? "eager" : "lazy"}
                        decoding="async"
                        width={720}
                        height={720}
                        className="relative mx-auto h-44 w-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.03] sm:h-64 md:h-[19rem] lg:h-[21rem]"
                      />
                      </div>
                    )}
                  </Link>
                  {gift && <span className="absolute right-4 top-4 z-10 grid h-16 w-16 place-content-center gap-1 rounded-full border bg-background/90 p-2 text-center text-[9px] font-bold leading-tight text-primary shadow-float backdrop-blur sm:right-6 sm:top-6 sm:h-20 sm:w-20 sm:text-[10px]"><Gift className="mx-auto h-3.5 w-3.5" /><span className="capitalize">{gift}</span></span>}
                </div>

              </CarouselItem>
            );
          })}
        </CarouselContent>
        {products.length > 1 && <><Button variant="outline" size="icon" onClick={() => api?.scrollPrev()} aria-label="Previous featured product" className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-hero-border bg-hero/80 text-hero-foreground backdrop-blur hover:bg-hero md:inline-flex"><ArrowLeft /></Button><Button variant="outline" size="icon" onClick={() => api?.scrollNext()} aria-label="Next featured product" className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-hero-border bg-hero/80 text-hero-foreground backdrop-blur hover:bg-hero md:inline-flex"><ArrowRight /></Button></>}
      </Carousel>

      {products.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {products.map((product, dot) => (
            <button
              key={product.node.id}
              type="button"
              onClick={() => scrollTo(dot)}
              aria-label={`Show ${product.node.title}`}
              aria-current={dot === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dot === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
