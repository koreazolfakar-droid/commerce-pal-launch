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
        className="group relative isolate aspect-[16/9] w-full max-w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-hero text-hero-foreground shadow-float sm:aspect-auto sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border lg:min-h-[28rem]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-primary/10 sm:block sm:inset-y-0 sm:end-[-8%] sm:start-auto sm:w-[55%] sm:rounded-full sm:blur-3xl"
        />

        {image?.url ? (
          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            data-testid="home-hero-media"
            className="absolute inset-0 z-[1] block overflow-hidden"
          >
            <img
              src={cdnImage(image.url, 1400)}
              srcSet={cdnSrcSet(image.url, 1400)}
              sizes="(max-width: 639px) calc(100vw - 1.5rem), (max-width: 767px) 100vw, (min-width: 1280px) 760px, 62vw"
              alt={image.altText ?? node.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.01] sm:inset-y-0 sm:end-0 sm:start-auto sm:w-[64%] sm:object-[66%_center] sm:opacity-100"
            />
          </Link>
        ) : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[42%] bg-gradient-to-t from-black/60 via-black/18 to-transparent sm:hidden"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 z-[2] hidden w-[68%] bg-gradient-to-r from-hero via-hero/95 to-transparent rtl:bg-gradient-to-l sm:block sm:w-[66%] md:w-[64%]"
        />

        <div
          data-testid="home-hero-mobile-controls"
          className="absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-3 sm:hidden"
        >
          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            className="press inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11px] font-black text-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:bg-white/95"
          >
            {t("shopNow")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>

          <div
            data-testid="home-hero-dots"
            aria-hidden="true"
            className="mb-1 flex items-center gap-1.5 rounded-full bg-black/22 px-2 py-1.5 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
            <span className="h-2 w-2 rounded-full bg-white/45" />
            <span className="h-2 w-2 rounded-full bg-white/45" />
            <span className="h-2 w-2 rounded-full bg-white/45" />
          </div>
        </div>

        <div
          data-testid="home-hero-content"
          className="relative z-10 hidden min-h-[25rem] w-[62%] flex-col justify-center px-8 py-8 sm:flex md:w-[52%] lg:min-h-[28rem] lg:w-[50%] lg:px-10 lg:py-10"
        >
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
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-hero-muted">
              {node.vendor}
            </p>
          )}

          <h2 className="line-clamp-3 max-w-none text-[clamp(2rem,5vw,3.8rem)] font-black leading-[1.01] tracking-[-0.045em] text-hero-foreground">
            {node.title}
          </h2>

          <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-6 text-hero-muted lg:text-base">
            {node.description?.trim() || intro}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-hero-muted">
              <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
              {t(inStock ? "inStock" : "outOfStock")}
            </span>
          </div>

          <div className="mt-3 text-2xl font-black tracking-tight">
            {formatPrice(price.amount, price.currencyCode)}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
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
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
