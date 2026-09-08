import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Timer } from "lucide-react";
import { useEffect, useState } from "react";

import { CompactProductCard } from "@/components/CompactProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { BenefitsBar } from "@/components/HomeSections";
import { Newsletter } from "@/components/Newsletter";
import { ProductCard } from "@/components/ProductCard";
import { PromoBanners, type PromoSlot } from "@/components/PromoBanners";
import { StoreLayout } from "@/components/StoreLayout";
import { TopBrands } from "@/components/TopBrands";
import { WhyShop } from "@/components/WhyShop";
import { buildShopifyBrands } from "@/lib/brandDirectory";
import {
  bestSellingQueryOptions,
  catalogQueryOptions,
  collectionsQueryOptions,
  homepageHeroQueryOptions,
} from "@/lib/queries";
import { discountPercent, productInStock, type ShopifyProduct } from "@/lib/shopify";
import { absoluteUrl, canonicalLink, jsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import type { CatalogFacet, CatalogIndex } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(bestSellingQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
      context.queryClient.ensureQueryData(homepageHeroQueryOptions()),
    ]);
  },

  head: () => ({
    meta: [
      { title: "Space Cell — Premium Phones, Tablets & Audio" },
      {
        name: "description",
        content:
          "Shop Space Cell smartphones, tablets, smartwatches, audio and accessories with live availability and secure Shopify checkout.",
      },
      { property: "og:title", content: "Space Cell — Premium Phones, Tablets & Audio" },
      {
        property: "og:description",
        content:
          "Premium smartphones, tablets, audio and accessories with live availability and secure checkout.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Space Cell — Premium Phones, Tablets & Audio" },
      { name: "twitter:description", content: "Premium smartphones, tablets, audio and accessories with live availability and secure checkout." },
    ],
    links: [canonicalLink("/")],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      }),
    ],
  }),
  component: Index,
});

function onSale(product: ShopifyProduct) {
  const variant = product.node.variants.edges[0]?.node;
  return (
    discountPercent(
      variant?.price.amount ?? product.node.priceRange.minVariantPrice.amount,
      variant?.compareAtPrice?.amount ??
        product.node.compareAtPriceRange?.minVariantPrice.amount,
    ) !== null
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-4 sm:px-0">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action ??
        (href ? (
          <Link
            to={href as "/shop"}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline sm:text-sm"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null)}
    </div>
  );
}

/** Mobile: horizontal carousel. Tablet/desktop: premium grid. */
function ProductRow({ products, compactOnMobile = true }: { products: ShopifyProduct[]; compactOnMobile?: boolean }) {
  return (
    <div className="scroll-rail flex gap-4 px-4 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
      {products.map((product) => (
        <div key={product.node.id} className="w-[10.5rem] shrink-0 sm:w-auto">
          <span className="block sm:hidden">
            {compactOnMobile ? <CompactProductCard product={product} /> : <ProductCard product={product} />}
          </span>
          <span className="hidden sm:block">
            <ProductCard product={product} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Real countdown to the end of the day — no invented promotional deadline. */
function DealsCountdown() {
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
        Today ends in
      </span>
      <span className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
        {parts.map((part, index) => (
          <span key={index} className="rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">
            {String(part).padStart(2, "0")}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Resolves the requested promo banners (Samsung, Laptops, Audio) from live data. */
function promoSlots(catalog: CatalogIndex, productOf: (facet: CatalogFacet, kind: "brand" | "category") => ShopifyProduct | undefined): PromoSlot[] {
  const brandBy = (slug: string) => catalog.brands.find((brand) => brand.slug === slug);
  const categoryBy = (...slugs: string[]) =>
    slugs.map((slug) => catalog.categories.find((entry) => entry.slug === slug)).find(Boolean);

  const wanted: PromoSlot[] = [];
  const pushBrand = (facet?: CatalogFacet) => {
    if (facet) wanted.push({ kind: "brand", facet, product: productOf(facet, "brand") });
  };
  const pushCategory = (facet?: CatalogFacet) => {
    if (facet) wanted.push({ kind: "category", facet, product: productOf(facet, "category") });
  };

  pushBrand(brandBy("samsung") ?? catalog.brands[0]);
  pushCategory(categoryBy("laptops"));
  pushCategory(categoryBy("audio", "headphones"));

  if (wanted.length < 2) {
    for (const facet of catalog.brands.slice(0, 3)) {
      if (!wanted.some((slot) => slot.facet.slug === facet.slug)) pushBrand(facet);
    }
  }
  return wanted;
}

function Index() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: bestSellers } = useSuspenseQuery(bestSellingQueryOptions());
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const { data: heroCollection } = useSuspenseQuery(homepageHeroQueryOptions());

  const products = catalog.products;
  const brands = buildShopifyBrands(catalog.brands, collections);
  const inStock = products.filter(productInStock);
  const deals = products.filter(onSale);
  const hero = (heroCollection?.products.length ? heroCollection.products : deals.length > 0 ? deals : inStock.length > 0 ? inStock : products).slice(0, 5);
  const best = (bestSellers ?? []).length > 0 ? bestSellers! : inStock;

  const firstOf = (facet: CatalogFacet, kind: "brand" | "category") =>
    products.find((product) =>
      kind === "brand"
        ? catalog.brandOf.get(product.node.handle)?.slug === facet.slug
        : (catalog.categoryOf.get(product.node.handle) ?? []).includes(facet.slug),
    );


  const slots = promoSlots(catalog, firstOf);
  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl space-y-14 pb-4 pt-2 sm:px-4 sm:pb-8 sm:pt-5 lg:space-y-20">
        {products.length === 0 ? (
          <div className="px-4">
            <div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
              <p className="font-semibold">No products found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a product in Shopify and it will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <>
            <HeroBanner products={hero} />

            <BenefitsBar />

            {catalog.categories.length > 0 && (
              <section className="rounded-3xl bg-surface py-5 sm:px-7 sm:py-7">
                <SectionHeader
                  title="Shop by category"
                  subtitle="Categories are generated from your live Shopify catalogue"
                  href="/shop"
                />
                <div className="scroll-rail flex gap-2.5 px-4 sm:grid sm:grid-cols-4 sm:gap-3 sm:px-0 lg:grid-cols-8">
                  {catalog.categories.slice(0, 8).map((category) => (
                    <Link
                      key={category.slug}
                      to="/category/$slug"
                      params={{ slug: category.slug }}
                      className="group card-lift flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3 text-center shadow-card transition-all hover:border-primary sm:w-auto sm:rounded-2xl sm:px-3 sm:py-4"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-primary/20 bg-accent text-primary shadow-card transition-all duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground sm:h-16 sm:w-16 sm:rounded-2xl">
                        {category.icon ? (
                          <category.icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.8} />
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-[11px] font-bold leading-snug sm:text-xs">
                        {category.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {category.count} item{category.count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <TopBrands brands={brands} />

            {best.length > 0 && (
              <section>
                <SectionHeader
                  title="Best sellers"
                  subtitle="Your top selling products, straight from Shopify"
                  href="/shop"
                />
                <ProductRow products={best.slice(0, 8)} />
              </section>
            )}

            <PromoBanners slots={slots} />

            {deals.length > 0 && (
              <section id="deals" className="scroll-mt-24">
                <SectionHeader
                  title="Today's deals"
                  subtitle="Live compare-at pricing from Shopify"
                  action={<DealsCountdown />}
                />
                <ProductRow products={deals.slice(0, 8)} />
                <div className="mt-5 px-4 sm:px-0">
                  <Link
                    to="/shop"
                    className="press inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-bold transition-colors hover:border-primary hover:text-primary"
                  >
                    View all deals <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            )}

            <WhyShop />
            <BenefitsBar compact />
            <Newsletter />
          </>
        )}
      </div>
    </StoreLayout>
  );
}
