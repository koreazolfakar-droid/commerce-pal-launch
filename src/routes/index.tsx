import { useLanguage } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { HomeCategorySection } from "@/components/HomeCategorySection";
import { HomeHero } from "@/components/HomeHero";
import { StoreLayout } from "@/components/StoreLayout";
import { applyCmsBrands, buildShopifyBrands } from "@/lib/brandDirectory";
import { cmsSeoPage, cmsText, EMPTY_CMS, fetchCmsSnapshot } from "@/lib/cms";
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
const HOME_SECONDARY_IDLE_TIMEOUT_MS = 1400;
const HOME_SECONDARY_FALLBACK_DELAY_MS = 350;

/**
 * Keep below-the-fold JavaScript and secondary Shopify requests out of the
 * startup critical path. They become available as soon as the browser reaches
 * an idle window, with a short fallback for browsers without requestIdleCallback.
 */
function useDeferredHomepageWork() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleRequestId: number | null = null;
    let fallbackTimer: number | null = null;
    const activate = () => {
      if (!cancelled) setReady(true);
    };

    if ("requestIdleCallback" in window) {
      idleRequestId = window.requestIdleCallback(activate, {
        timeout: HOME_SECONDARY_IDLE_TIMEOUT_MS,
      });
    } else {
      fallbackTimer = window.setTimeout(activate, HOME_SECONDARY_FALLBACK_DELAY_MS);
    }

    return () => {
      cancelled = true;
      if (idleRequestId !== null) window.cancelIdleCallback(idleRequestId);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return ready;
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [heroCollection, cms] = await Promise.all([
      context.queryClient.ensureQueryData(collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4)),
      fetchCmsSnapshot(),
    ]);
    const heroImage = heroCollection?.products?.[0]?.node.images.edges[0]?.node.url;
    return { heroImage, cmsSeo: cmsSeoPage(cms, "home") };
  },
  head: ({ loaderData }) => {
    const cmsSeo = loaderData?.cmsSeo;
    const title =
      cmsSeo?.title?.trim() || `${SITE_NAME} Lebanon | Official Online Electronics Store`;
    const description =
      cmsSeo?.description?.trim() ||
      `${SITE_NAME} Lebanon is an online electronics store for smartphones, tablets, laptops, headphones, smartwatches and accessories with live availability and secure Shopify checkout.`;
    const image = cmsSeo?.og_image_url?.trim() || loaderData?.heroImage;
    const canonicalUrl = cmsSeo?.canonical_url?.trim();
    const customJsonLd = cmsSeo?.json_ld;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "application-name", content: SITE_NAME },
        { name: "apple-mobile-web-app-title", content: SITE_NAME },
        {
          name: "robots",
          content:
            cmsSeo?.robots?.trim() ||
            "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        ...socialMeta({
          title,
          description,
          path: "/",
          ...(image ? { image } : {}),
        }),
      ],
      links: [
        canonicalUrl ? { rel: "canonical", href: canonicalUrl } : canonicalLink("/"),
        ...languageAlternateLinks({ path: "/", arabicPath: "/ar" }),
      ],
      scripts: [
        jsonLd(websiteJsonLd()),
        jsonLd(organizationJsonLd()),
        ...(customJsonLd && Object.keys(customJsonLd).length ? [jsonLd(customJsonLd)] : []),
      ],
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

function SectionFallback({ className = "h-52" }: { className?: string }) {
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
  const deferredWorkReady = useDeferredHomepageWork();
  const { data: cms = EMPTY_CMS } = useQuery(cmsQueryOptions());
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections = [] } = useQuery(collectionsQueryOptions());
  const { data: heroCollection } = useQuery(collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4));
  const catalogReady = Boolean(catalog);
  const secondaryQueriesReady = catalogReady && deferredWorkReady;
  const { data: newItems = [] } = useQuery({
    ...newestQueryOptions(),
    enabled: secondaryQueriesReady,
  });
  const { data: bestSellers = [] } = useQuery({
    ...bestSellingQueryOptions(),
    enabled: secondaryQueriesReady,
  });

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
  const brands = catalog
    ? applyCmsBrands(buildShopifyBrands(catalog.brands, collections), cms.brands)
    : [];
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
          <div className="h-28 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
        )}
        {isVisible("brands") ? (
          catalog ? (
            <Suspense fallback={<SectionFallback className="h-24" />}>
              <LazyTopBrands brands={brands} />
            </Suspense>
          ) : (
            <div className="h-24 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
          )
        ) : null}

        {catalogReady ? (
          <>
            {isVisible("featured_products") && best.length > 0 && (
              <section data-testid="best-sellers">
                <SectionHeader title={t("bestSellers")} subtitle={t("bestSellersDescription")} />
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
                <Suspense fallback={<SectionFallback className="h-72" />}>
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

            {isVisible("featured_products") && deferredWorkReady ? (
              <Suspense fallback={<SectionFallback className="h-64" />}>
                <LazyBundleSection collections={collections} />
                {homepageCatalog ? (
                  <LazyBrandShowcase catalog={homepageCatalog} collections={collections} />
                ) : null}
              </Suspense>
            ) : null}
          </>
        ) : (
          <div className="h-52 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
        )}

        {deferredWorkReady ? (
          <Suspense fallback={null}>
            <LazyRecentlyViewed products={merchandiseProducts} />
            {isVisible("trust") ? (
              <>
                <LazyServicesStrip />
                <LazyWhyShop />
              </>
            ) : null}
          </Suspense>
        ) : null}
      </div>
    </StoreLayout>
  );
}
