import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { discountPercent, formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { resolveBrand } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/** Real feature bullets only: Shopify tags first, then option names. */
function featureBullets(product: ShopifyProduct) {
  const node = product.node;
  const tags = (node.tags ?? [])
    .filter((tag) => !tag.includes(":") && tag.length <= 28)
    .slice(0, 3);
  if (tags.length > 0) return tags;
  return node.options
    .filter((option) => option.name.toLowerCase() !== "title")
    .slice(0, 3)
    .map((option) => `${option.name}: ${option.values.slice(0, 3).join(" / ")}`);
}

/** Premium hero card: brand label, headline, bullets, pricing, CTA, carousel dots. */
export function HeroBanner({ products }: { products: ShopifyProduct[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (products.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % products.length), 6500);
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
  const brand = resolveBrand(active);
  const bullets = featureBullets(active);
  const gift = (node.tags ?? []).find((tag) => /free\s|gift|bundle/i.test(tag));

  return (
    <section className="px-4 sm:px-0" aria-label="Featured product">
      <div className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-accent/80 via-surface to-background shadow-card">
        <div
          key={node.id}
          className="animate-fade grid items-center gap-5 p-5 sm:p-8 md:grid-cols-2 lg:gap-10 lg:p-12"
        >
          <div className="order-2 min-w-0 md:order-1">
            <div className="flex items-center gap-2">
              {brand && <BrandLogo slug={brand.slug} label={brand.label} size={28} />}
              <span className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {brand?.label ?? node.productType ?? "Featured"}
              </span>
            </div>

            <h1 className="mt-3 line-clamp-3 text-2xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.75rem]">
              {node.title}
            </h1>

            {bullets.length > 0 && (
              <ul className="mt-4 grid gap-1.5">
                {bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate capitalize">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              {discount !== null && compareAt && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(compareAt, price.currencyCode)}
                  </span>
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/product/$handle"
                params={{ handle: node.handle }}
                className="press inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card-hover transition-opacity hover:opacity-90"
              >
                Shop now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Official warranty
              </span>
            </div>
          </div>

          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            className="media-frame order-1 block aspect-4/3 rounded-2xl bg-transparent md:order-2 md:aspect-square"
          >
            {image && (
              <img
                src={cdnImage(image.url, 720)}
                srcSet={cdnSrcSet(image.url, 720)}
                sizes="(min-width: 1024px) 520px, 90vw"
                alt={image.altText ?? node.title}
                fetchPriority="high"
                decoding="async"
                width={720}
                height={720}
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            )}
          </Link>
        </div>

        {gift && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-card">
            <Gift className="h-3.5 w-3.5" />
            <span className="capitalize">{gift}</span>
          </span>
        )}
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
