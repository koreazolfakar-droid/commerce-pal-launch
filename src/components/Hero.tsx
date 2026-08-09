import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";

export function HeroPanel({ slides }: { slides: ShopifyProduct[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index]?.node;

  if (!slide) {
    return (
      <div className="grid min-h-80 place-items-center rounded-xl border bg-promo px-6 text-center text-muted-foreground">
        Add products in Shopify to feature them here.
      </div>
    );
  }

  const image = slide.images.edges[0]?.node;
  const price = slide.priceRange.minVariantPrice;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-linear-to-br from-promo via-promo to-background">
      <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            New arrival
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {slide.title}
          </h1>
          <p className="mt-2 text-xl font-medium sm:text-2xl">Built for what's next.</p>
          {slide.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{slide.description}</p>
          )}
          <p className="mt-5 text-lg font-semibold">
            From {formatPrice(price.amount, price.currencyCode)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/product/$handle" params={{ handle: slide.handle }}>
                Shop now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/product/$handle" params={{ handle: slide.handle }}>
                Learn more
              </Link>
            </Button>
          </div>
        </div>

        <Link
          to="/product/$handle"
          params={{ handle: slide.handle }}
          className="order-first md:order-none"
        >
          {image && (
            <img
              src={image.url}
              alt={image.altText ?? slide.title}
              width={720}
              height={720}
              className="mx-auto max-h-72 w-auto object-contain sm:max-h-96"
            />
          )}
        </Link>
      </div>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((item, dotIndex) => (
              <button
                key={item.node.id}
                type="button"
                aria-label={`Show slide ${dotIndex + 1}`}
                aria-current={dotIndex === index}
                onClick={() => setIndex(dotIndex)}
                className={`h-2 rounded-full transition-all ${
                  dotIndex === index ? "w-5 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute bottom-3 left-4 grid h-9 w-9 place-items-center rounded-full border bg-background/80 text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
            className="absolute bottom-3 right-4 grid h-9 w-9 place-items-center rounded-full border bg-background/80 text-muted-foreground hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

        </>
      )}
    </div>
  );
}

export function HeroSideCard({ product }: { product: ShopifyProduct }) {
  const node = product.node;
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;

  return (
    <Link
      to="/product/$handle"
      params={{ handle: node.handle }}
      className="flex w-64 shrink-0 items-center gap-3 rounded-xl border bg-promo p-4 transition-shadow hover:shadow-card-hover lg:w-auto"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{node.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          From {formatPrice(price.amount, price.currencyCode)}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          Shop now <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      {image && (
        <img
          src={image.url}
          alt={image.altText ?? node.title}
          loading="lazy"
          width={96}
          height={96}
          className="h-20 w-20 shrink-0 object-contain"
        />
      )}
    </Link>
  );
}
