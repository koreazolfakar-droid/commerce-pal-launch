import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { discountPercent, formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

/** Auto-rotating promo banner built only from real Shopify products. */
export function PromoBanner({ products }: { products: ShopifyProduct[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (products.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % products.length), 5000);
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
    <section className="px-4">
      <div className="relative overflow-hidden rounded-2xl bg-accent">
        <div className="grid grid-cols-[minmax(0,1fr)_40%] items-center gap-2 p-5 lg:p-8">
          <div className="min-w-0">
            {node.vendor && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-foreground/80">
                {node.vendor}
              </p>
            )}
            <h2 className="mt-1 line-clamp-2 text-lg font-bold leading-tight text-accent-foreground lg:text-3xl">
              {node.title}
            </h2>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-base font-bold text-primary lg:text-2xl">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              {discount !== null && compareAt && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(compareAt, price.currencyCode)}
                </span>
              )}
            </p>

            <Link
              to="/product/$handle"
              params={{ handle: node.handle }}
              className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground lg:text-sm"
            >
              Shop now
            </Link>
          </div>
          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            className="block aspect-square"
          >
            {image && (
              <img
                src={image.url}
                alt={image.altText ?? node.title}
                loading="lazy"
                width={480}
                height={480}
                className="h-full w-full object-contain"
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
                "h-1.5 rounded-full transition-all",
                dot === index ? "w-5 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
