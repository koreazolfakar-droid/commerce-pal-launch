import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import { formatPrice, productDiscountPercent, type ShopifyProduct } from "@/lib/shopify";

function featuredProduct(products: ShopifyProduct[]) {
  return (
    products.find(
      (product) =>
        product.node.availableForSale !== false && Boolean(product.node.images.edges[0]?.node.url),
    ) ??
    products.find((product) => Boolean(product.node.images.edges[0]?.node.url)) ??
    products[0] ??
    null
  );
}

export function HomeHero({ products }: { products: ShopifyProduct[] }) {
  const { t, language } = useLanguage();
  const featured = featuredProduct(products);

  if (!featured) return <TrustBenefitsRail />;

  const node = featured.node;
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;
  const discount = productDiscountPercent(featured);
  const inStock = node.availableForSale !== false;
  const intro =
    language === "ar"
      ? "اختيار مميز من Space Call — جهاز واحد، تركيز أوضح، وتجربة شراء أسرع."
      : "A Space Call spotlight — one featured device, clearer focus, faster shopping.";

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-handle={node.handle}
        className="relative isolate min-w-0 overflow-hidden rounded-[clamp(1.25rem,3vw,2rem)] border border-hero-border bg-hero text-hero-foreground shadow-float"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 start-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative grid min-w-0 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-stretch">
          <div className="flex min-w-0 flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hero-border bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-hero-muted backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {t("featuredTechnology")}
              </span>
              {discount !== null && (
                <span className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground">
                  -{discount}%
                </span>
              )}
            </div>

            {node.vendor && (
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-hero-muted">
                {node.vendor}
              </p>
            )}

            <h2 className="max-w-2xl text-[clamp(1.8rem,5vw,3.8rem)] font-black leading-[1.02] tracking-[-0.045em] text-hero-foreground">
              {node.title}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-hero-muted sm:text-base">
              {node.description?.trim() || intro}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
              <span className="text-xl font-black tracking-tight sm:text-2xl">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-hero-muted">
                <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
                {t(inStock ? "inStock" : "outOfStock")}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-7">
              <Link
                to="/product/$handle"
                params={{ handle: node.handle }}
                className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-lg transition hover:brightness-105"
              >
                {t("shopNow")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link
                to="/shop"
                className="press inline-flex min-h-11 items-center justify-center rounded-full border border-hero-border bg-white/5 px-5 py-2.5 text-sm font-bold text-hero-foreground backdrop-blur transition hover:bg-white/10"
              >
                {t("viewAll")}
              </Link>
            </div>
          </div>

          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            className="group relative flex min-h-[15.5rem] min-w-0 items-center justify-center overflow-hidden border-t border-hero-border bg-card/95 p-5 sm:min-h-[19rem] sm:p-7 md:m-4 md:min-h-[24rem] md:rounded-[1.5rem] md:border"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-[18%] bottom-[8%] h-[16%] rounded-full bg-primary/20 blur-2xl"
            />
            {image?.url ? (
              <img
                src={cdnImage(image.url, 900)}
                srcSet={cdnSrcSet(image.url, 900)}
                sizes="(max-width: 767px) calc(100vw - 3rem), (min-width: 1280px) 560px, 46vw"
                alt={image.altText ?? node.title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="relative z-10 h-[13.5rem] w-full max-w-[34rem] object-contain drop-shadow-xl transition duration-500 ease-out group-hover:scale-[1.025] sm:h-[17rem] md:h-[22rem]"
              />
            ) : (
              <span className="relative z-10 grid h-36 w-36 place-items-center rounded-full border border-border bg-surface text-primary shadow-card">
                <Sparkles className="h-12 w-12" aria-hidden="true" />
              </span>
            )}
          </Link>
        </div>
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
