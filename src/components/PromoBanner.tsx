import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { cdnImage, cdnSrcSet } from "@/lib/image";
import { discountPercent, formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

/** Auto-rotating hero built only from real Shopify products. */
export function PromoBanner({ products }: { products: ShopifyProduct[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (products.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % products.length), 6000);
    return () => clearInterval(timer);
  }, [products.length]);

  if (products.length === 0) return null;

  const active = products[Math.min(index, products.length - 1)]!;
  const node = active.node;
  const image = node.images.edges[0]?.node;
  const variant = node.variants.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const compareAt =
    variant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(price.amount, compareAt);

  return (
    <section className="px-4 sm:px-0" aria-label="Featured product">
      <div className="relative overflow-hidden rounded-3xl border bg-accent/70 shadow-card">
        <div
          key={node.id}
          className="animate-fade grid grid-cols-[minmax(0,1fr)_42%] items-center gap-3 p-5 sm:p-8 lg:p-12"
        >
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-accent-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {node.vendor || "Featured"}
            </p>
            <h2 className="mt-3 line-clamp-2 text-xl font-extrabold leading-[1.1] text-accent-foreground sm:text-3xl lg:text-[2.6rem]">
              {node.title}
            </h2>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="text-lg font-extrabold tracking-tight text-primary sm:text-2xl lg:text-3xl">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              {discount !== null && compareAt && (
                <>
                  <span className="text-xs text-accent-foreground/60 line-through sm:text-sm">
                    {formatPrice(compareAt, price.currencyCode)}
                  </span>
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    -{discount}%
                  </span>
                </>
              )}
            </p>

            <Link
              to="/product/$handle"
              params={{ handle: node.handle }}
              className="press mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-card-hover transition-opacity hover:opacity-90 sm:text-sm"
            >
              Shop now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            className="media-frame block aspect-square rounded-2xl bg-transparent"
          >
            {image && (
              <img
                src={cdnImage(image.url, 560)}
                srcSet={cdnSrcSet(image.url, 560)}
                sizes="(min-width: 1024px) 480px, 40vw"
                alt={image.altText ?? node.title}
                fetchPriority="high"
                decoding="async"
                width={560}
                height={560}
                className="h-full w-full object-contain drop-shadow-xl"
              />
            )}
          </Link>
        </div>
      </div>

      {products.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {products.map((product, dot) => (
            <button
              key={product.node.id}
              type="button"
              onClick={() => setIndex(dot)}
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
