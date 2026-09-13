import { useLanguage } from "@/lib/i18n";
import { DealSpotlight } from "@/components/DealSpotlight";
import { useEffect, useState } from "react";
import { ProductRail } from "@/components/ProductRail";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";

import { RecentlyViewed, ServicesStrip } from "@/components/HomeSections";
import { HomeHero } from "@/components/HomeHero";
import { StoreLayout } from "@/components/StoreLayout";
import { TopBrands } from "@/components/TopBrands";
import { WhyShop } from "@/components/WhyShop";
import { BrandShowcase, BundleSection, CategorySection } from "@/components/BrandShowcaseSections";
import { buildShopifyBrands } from "@/lib/brandDirectory";
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
  organizationJsonLd,
  SITE_NAME,
  socialMeta,
  websiteJsonLd,
} from "@/lib/seo";
import "../home-ticker.css";

const HOME_HERO_COLLECTION_HANDLE = "homepage-hero";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
      context.queryClient.ensureQueryData(collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4)),
    ]);
  },
  head: () => {
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
        ...socialMeta({ title, description, path: "/" }),
      ],
      links: [canonicalLink("/")],
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

function HomePromoTicker({ language }: { language: string }) {
  const heading =
    language === "ar"
      ? "Space Call لبنان - متجر الهواتف والإلكترونيات"
      : "Space Call Lebanon - Phones & Electronics Store";
  const details =
    language === "ar"
      ? "متجرك الموثوق للهواتف والإلكترونيات • توفر مباشر • أسعار واضحة • دفع آمن"
      : "Your trusted phones & electronics store • Live availability • Clear pricing • Secure checkout";
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
  const [showProductSections, setShowProductSections] = useState(false);
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const { data: heroCollection } = useSuspenseQuery(
    collectionQueryOptions(HOME_HERO_COLLECTION_HANDLE, 4),
  );
  const { data: newItems = [] } = useQuery({
    ...newestQueryOptions(),
    enabled: showProductSections,
  });
  const { data: bestSellers = [] } = useQuery({
    ...bestSellingQueryOptions(),
    enabled: showProductSections,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setShowProductSections(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const products = catalog.products;
  const brands = buildShopifyBrands(catalog.brands, collections);
  const deals = products.filter((product) => productDiscountPercent(product) !== null);
  const best = bestSellers ?? [];

  return (
    <StoreLayout>
      <div className="home-page">
        {products.length === 0 ? (
          <div className="px-4">
            <div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
              <h1 className="text-2xl font-bold">{t("welcomeStore")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("catalogUpdating")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4">
              <HomePromoTicker language={language} />
              <HomeHero products={products} heroCollection={heroCollection} />
            </div>

            <CategorySection catalog={catalog} collections={collections} />
            <TopBrands brands={brands} />

            {showProductSections ? (
              <>
                {best.length > 0 && (
                  <section data-testid="best-sellers">
                    <SectionHeader
                      title={t("bestSellers")}
                      subtitle={t("bestSellersDescription")}
                    />
                    <ProductRail products={best} storageKey="space-cell-home-best-sellers-view" />
                  </section>
                )}

                {deals.length > 0 && (
                  <section id="deals" className="scroll-mt-24" data-testid="deals-section">
                    <SectionHeader
                      title={t("todaysDeals")}
                      subtitle={t("dealsDescription")}
                      action={<DealsCountdown />}
                    />
                    {deals.length <= 2 ? (
                      <DealSpotlight products={deals} />
                    ) : (
                      <ProductRail products={deals} storageKey="space-cell-home-deals-view" />
                    )}
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

                {newItems.length > 0 && (
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
                    <ProductRail products={newItems} storageKey="space-cell-home-new-items-view" />
                  </section>
                )}

                <BundleSection collections={collections} />
                <BrandShowcase catalog={catalog} collections={collections} />
              </>
            ) : (
              <div className="h-52 animate-pulse rounded-3xl bg-surface" aria-hidden="true" />
            )}

            <RecentlyViewed products={products} />
            <ServicesStrip />
            <WhyShop />
          </>
        )}
      </div>
    </StoreLayout>
  );
}
