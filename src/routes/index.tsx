import { useLanguage } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { HomeCategorySection } from "@/components/HomeCategorySection";
import { HomeHero } from "@/components/HomeHero";
import { StoreLayout } from "@/components/StoreLayout";
import { buildShopifyBrands } from "@/lib/brandDirectory";
import { cmsText, EMPTY_CMS } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import {
  bestSellingQueryOptions,
  newestQueryOptions,
  catalogQueryOptions,
  collectionQueryOptions,
  collectionsQueryOptions,
} from "@/lib/queries";
import { productDiscountPercent } from "@/lib/shopify";
import {
  canonicalLink,
  jsonLd,
  languageAlternateLinks,
  organizationJsonLd,
  SITE_NAME,
  socialMeta,
  websiteJsonLd,
} from "@/lib/seo";
import "../home-ticker.css";

const LazyDealSpotlight = lazy(() =>
  import("@/components/DealSpotlight").then((module) => ({ default: module.DealSpotlight })),
);
const LazyProductRail = lazy(() =>
  import("@/components/ProductRail").then((module) => ({ default: module.ProductRail })),
);
const LazyRecentlyViewed = lazy(() =>
  import("@/components/HomeSections").then((module) => ({ default: module.RecentlyViewed })),
);
const LazyServicesStrip = lazy(() =>
  import("@/components/HomeSections").then((module) => ({ default: module.ServicesStrip })),
);
const LazyTopBrands = lazy(() =>
  import("@/components/TopBrands").then((module) => ({ default: module.TopBrands })),
);
const LazyWhyShop = lazy(() =>
  import("@/components/WhyShop").then((module) => ({ default: module.WhyShop })),
);
const LazyBundleSection = lazy(() =>
  import("@/components/BrandShowcaseSections").then((module) => ({
    default: module.BundleSection,
  })),
);
const LazyBrandShowcase = lazy(() =>
  import("@/components/BrandShowcaseSections").then((module) => ({
    default: module.BrandShowcase,
  })),
);

const HOME_HERO_COLLECTION_HANDLE = "homepage-hero";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    // Keep the first render lightweight: only the tiny hero collection is required
    // before HTML can stream. The larger catalog is fetched without suspending the page.
    const heroCollection = await context.queryClient.ensureQueryData(
      collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4),
    );
    const heroImage = heroCollection?.products?.[0]?.node.images.edges[0]?.node.url;
    return { heroImage };
  },
  head: ({ loaderData }) => {
    const title = `${SITE_NAME} Lebanon | Official Online Electronics Store`;
    const description = `${SITE_NAME} Lebanon is an online electronics store for smartphones, tablets, laptops, headphones, smartwatches and accessories with live availability and secure Shopify checkout.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "application-name", content: SITE_NAME },
        { name: "apple-mobile-web-app-title", content: SITE_NAME },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        ...socialMeta({
          title,
          description,
          path: "/",
          ...(loaderData?.heroImage ? { image: loaderData.heroImage } : {}),
        }),
      ],
      links: [canonicalLink("/"), ...languageAlternateLinks({ path: "/", arabicPath: "/ar" })],
      scripts: [jsonLd(websiteJsonLd()), jsonLd(organizationJsonLd())],
    };
  },
  component: Index,
});

function SectionHeader({
  title,
  subtitle,
  href = "/shop",
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="home-section-header">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ?? (
        <Link
          to={href as "/shop"}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}

function SectionFallback({ className = "h-64" }: { className?: string }) {
  return <div className={`${className} rounded-3xl bg-surface`} aria-hidden="true" />;
}

function DealsCountdown() {
  const { t } = useLanguage();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      setLeft(end.getTime() - now.getTime());
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (left === null) return null;
  const total = Math.max(0, Math.floor(left / 1000));
  const parts = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-card">
      <Timer className="h-3.5 w-3.5 text-primary" />
      <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">
        {t("todayEnds")}
      </span>
      <span className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
        {parts.map((part, i) => (
          <span key={i} className="rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">
            {String(part).padStart(2, "0")}
          </span>
        ))}
      </span>
    </div>
  );
}

function HomePromoTicker({ heading, details }: { heading: string; details: string }) {
  const accessibleLabel = `${heading} • ${details}`;

  return (
    <div
      className="home-promo-ticker"
      data-testid="homepage-promo-ticker"
      aria-label={accessibleLabel}
    >
      <div className="home-promo-ticker-track">
        <span className="home-promo-ticker-copy">
          <h1 className="m-0 inline text-[inherit] font-[inherit] tracking-[inherit]">{heading}</h1>
          <span className="home-promo-ticker-dot" aria-hidden="true">
            •
          </span>
          <span>{details}</span>
        </span>
        <span className="home-promo-ticker-copy" aria-hidden="true">
          <span>{heading}</span>
          <span className="home-promo-ticker-dot">•</span>
          <span>{details}</span>
        </span>
      </div>
    </div>
  );
}

function Index() {
  const { t, language } = useLanguage();
  const { data: cms = EMPTY_CMS } = useQuery(cmsQueryOptions());
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections = [] } = useQuery(collectionsQueryOptions());
  const { data: heroCollection } = useQuery(collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4));
  const catalogReady = Boolean(catalog);
  const { data: newItems = [] } = useQuery({
    ...newestQueryOptions(),
    enabled: catalogReady,
  });
  const { data: bestSellers = [] } = useQuery({
    ...bestSellingQueryOptions(),
    enabled: catalogReady,
  });

  // Products priced at $0 inside `homepage-hero` are presentation-only entries.
  // Crucially, keep the original catalog intact for HomeHero so changing homepage
  // merchandising can never remove the hero itself.
  const heroOnlyProductIds = new Set(
    (heroCollection?.products ?? [])
      .filter((product) => Number(product.node.priceRange.minVariantPrice.amount) <= 0)
      .map((product) => product.node.id),
  );
  const isHomepageMerchandise = (product: NonNullable<typeof catalog>["products"][number]) =>
    !heroOnlyProductIds.has(product.node.id);

  const products = catalog?.products ?? [];
  const merchandiseProducts = products.filter(isHomepageMerchandise);
  const homepageCatalog = catalog ? { ...catalog, products: merchandiseProducts } : null;
  const brands = catalog ? buildShopifyBrands(catalog.brands, collections) : [];
  const deals = merchandiseProducts.filter((product) => productDiscountPercent(product) !== null);
  const best = (bestSellers ?? []).filter(isHomepageMerchandise);
  const latest = newItems.filter(isHomepageMerchandise);
  const isVisible = (key: string) =>
    cms.sections.find((section) => section.section_key === key)?.is_visible ?? true;

  const tickerHeading =
    cmsText(cms, language === "ar" ? "home_ticker_heading_ar" : "home_ticker_heading_en") ??
    (language === "ar"
      ? "Space Call لبنان - متجر الهواتف والإلكترونيات"
      : "Space Call Lebanon - Phones & Electronics Store");
  const tickerDetails =
    cmsText(cms, language === "ar" ? "home_ticker_details_ar" : "home_ticker_details_en") ??
    (language === "ar"
      ? "متجرك الموثوق للهواتف والإلكترونيات • توفر مباشر • أسعار واضحة • دفع آمن"
      : "Your trusted phones & electronics store • Live availability • Clear pricing • Secure checkout");

  return (
    <StoreLayout>
      <div className="home-page">
        {isVisible("hero") ? (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4">
            <HomePromoTicker heading={tickerHeading} details={tickerDetails} />
            <HomeHero
              products={products}
              heroCollection={heroCollection}
              cmsHeroSlides={cms.heroSlides}
            />
          </div>
        ) : null}

        {catalog ? (
          <HomeCategorySection catalog={catalog} collections={collections} />
        ) : (
          <SectionFallback className="h-[10rem] sm:h-[11rem]" />
        )}
        {isVisible("brands") ? (
          catalog ? (
            <Suspense fallback={<SectionFallback className="h-24" />}>
              <LazyTopBrands brands={brands} />
            </Suspense>
          ) : (
            <SectionFallback className="h-24" />
          )
        ) : null}

        {catalogReady ? (
          <>
            {isVisible("featured_products") && best.length > 0 && (
              <section data-testid="best-sellers">
                <SectionHeader
                  title={t("bestSellers")}
                  subtitle={t("bestSellersDescription")}
                />
                <Suspense fallback={<SectionFallback />}>
                  <LazyProductRail products={best} storageKey="space-cell-home-best-sellers-view" />
                </Suspense>
              </section>
            )}

            {isVisible("featured_products") && deals.length > 0 && (
              <section id="deals" className="scroll-mt-24" data-testid="deals-section">
                <SectionHeader
                  title={t("todaysDeals")}
                  subtitle={t("dealsDescription")}
                  action={<DealsCountdown />}
                />
                <Suspense fallback={<SectionFallback />}>
                  {deals.length <= 2 ? (
                    <LazyDealSpotlight products={deals} />
                  ) : (
                    <LazyProductRail products={deals} storageKey="space-cell-home-deals-view" />
                  )}
                </Suspense>
                <div className="mt-4">
                  <Link
                    to="/shop"
                    search={{ availability: "on-sale" }}
                    className="press inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-bold hover:border-primary hover:text-primary"
                  >
                    {t("allDeals")} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            )}

            {isVisible("featured_products") && latest.length > 0 && (
              <section data-testid="new-items">
                <SectionHeader
                  title={t("newItems")}
                  subtitle={t("newItemsDescription")}
                  action={
                    <Link
                      to="/shop"
                      search={{ sort: "newest" }}
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Link>
                  }
                />
                <Suspense fallback={<SectionFallback />}>
                  <LazyProductRail products={latest} storageKey="space-cell-home-new-items-view" />
                </Suspense>
              </section>
            )}

            {isVisible("featured_products") ? (
              <Suspense fallback={<SectionFallback className="h-52" />}>
                <LazyBundleSection collections={collections} />
                {homepageCatalog ? (
                  <LazyBrandShowcase catalog={homepageCatalog} collections={collections} />
                ) : null}
              </Suspense>
            ) : null}
          </>
        ) : (
          <SectionFallback className="h-52" />
        )}

        <Suspense fallback={null}>
          <LazyRecentlyViewed products={merchandiseProducts} />
        </Suspense>
        {isVisible("trust") ? (
          <Suspense fallback={<SectionFallback className="h-44" />}>
            <LazyServicesStrip />
            <LazyWhyShop />
          </Suspense>
        ) : null}
      </div>
    </StoreLayout>
  );
}
