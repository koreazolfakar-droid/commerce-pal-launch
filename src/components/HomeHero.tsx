import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";

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
  const spotlightLabel = language === "ar" ? "اختيار Space Call" : "Space Call Pick";
  const trustedLabel = language === "ar" ? "تسوق موثوق" : "Trusted shopping";

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-handle={node.handle}
        className="group relative isolate min-w-0 overflow-hidden rounded-[1.35rem] border border-primary/30 bg-hero text-hero-foreground shadow-float sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] sm:border-hero-border lg:min-h-[28rem]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -start-20 -top-20 h-52 w-52 rounded-full bg-primary/14 blur-3xl sm:inset-y-0 sm:end-[-8%] sm:start-auto sm:top-auto sm:h-auto sm:w-[55%]"
        />

        {image?.url ? (
          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            data-testid="home-hero-media"
            className="relative z-[1] mx-2.5 mt-2.5 block aspect-[16/10] overflow-hidden rounded-[1.05rem] border border-primary/40 bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:absolute sm:inset-0 sm:m-0 sm:aspect-auto sm:w-full sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,hsl(var(--primary)/0.16),transparent_52%)] sm:hidden"
            />
            <img
              src={cdnImage(image.url, 1400)}
              srcSet={cdnSrcSet(image.url, 1400)}
              sizes="(max-width: 639px) calc(100vw - 2.25rem), (max-width: 767px) 100vw, (min-width: 1280px) 760px, 62vw"
              alt={image.altText ?? node.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="relative z-[1] h-full w-full object-contain object-center transition duration-700 ease-out group-hover:scale-[1.015] sm:absolute sm:inset-y-0 sm:end-0 sm:w-[64%] sm:object-cover sm:object-[66%_center] sm:opacity-100"
            />
          </Link>
        ) : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 hidden w-[68%] bg-gradient-to-r from-hero via-hero/95 to-transparent rtl:bg-gradient-to-l sm:block sm:w-[66%] md:w-[64%]"
        />

        <div
          data-testid="home-hero-content"
          className="relative z-10 flex w-full flex-col px-4 pb-4 pt-4 sm:min-h-[25rem] sm:w-[62%] sm:justify-center sm:px-8 sm:py-8 md:w-[52%] lg:min-h-[28rem] lg:w-[50%] lg:px-10 lg:py-10"
        >
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 sm:mb-4 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-hero-muted backdrop-blur sm:border-hero-border sm:bg-white/5 sm:px-3 sm:py-1.5 sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("featuredTechnology")}
            </span>
            {discount !== null && (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-black text-primary-foreground sm:px-3 sm:py-1.5 sm:text-[11px]">
                -{discount}%
              </span>
            )}
          </div>

          {node.vendor && (
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-hero-muted sm:mb-2 sm:text-xs">
              {node.vendor}
            </p>
          )}

          <h2 className="line-clamp-2 max-w-full text-[clamp(1.65rem,7.5vw,2.3rem)] font-black leading-[1.02] tracking-[-0.045em] text-hero-foreground sm:line-clamp-3 sm:max-w-none sm:text-[clamp(2rem,5vw,3.8rem)] sm:leading-[1.01]">
            {node.title}
          </h2>

          <p className="mt-2 line-clamp-2 max-w-[34rem] text-[11px] leading-[1.55] text-hero-muted sm:mt-4 sm:max-w-xl sm:text-sm sm:leading-6 lg:text-base">
            {node.description?.trim() || intro}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-hero-muted sm:text-xs">
              <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
              {t(inStock ? "inStock" : "outOfStock")}
            </span>
          </div>

          <div className="mt-2 text-[1.35rem] font-black tracking-tight sm:mt-3 sm:text-2xl">
            {formatPrice(price.amount, price.currencyCode)}
          </div>

          <div className="mt-4 grid w-full grid-cols-[1.18fr_0.9fr] gap-2 sm:mt-6 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:gap-2.5">
            <Link
              to="/product/$handle"
              params={{ handle: node.handle }}
              className="press inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full bg-primary px-3 py-2.5 text-[11px] font-extrabold text-primary-foreground shadow-lg transition hover:brightness-105 sm:w-auto sm:gap-2 sm:px-5 sm:text-sm"
            >
              {t("shopNow")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/shop"
              className="press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-primary/25 bg-white/[0.045] px-3 py-2.5 text-[11px] font-bold text-hero-foreground backdrop-blur transition hover:bg-white/10 sm:w-auto sm:border-hero-border sm:px-5 sm:text-sm"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>

        <div className="relative z-10 mx-2.5 mb-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[0.95rem] border border-primary/20 bg-primary/[0.065] px-3 py-2.5 text-[9px] font-semibold text-hero-muted backdrop-blur sm:hidden">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{spotlightLabel}</span>
          </span>
          <span aria-hidden="true" className="h-4 w-px bg-primary/20" />
          <span className="inline-flex min-w-0 items-center justify-end gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{trustedLabel}</span>
          </span>
        </div>
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
