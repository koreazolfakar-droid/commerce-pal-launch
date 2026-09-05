import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";

import { BrandBanners } from "@/components/BrandBanners";
import { CollectionSections } from "@/components/CollectionSections";
import { CompactProductCard } from "@/components/CompactProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { BenefitsBar } from "@/components/HomeSections";
import { Newsletter } from "@/components/Newsletter";
import { ProductGrid } from "@/components/ProductGrid";
import { StoreLayout } from "@/components/StoreLayout";
import { TopBrands } from "@/components/TopBrands";
import { WhyShop } from "@/components/WhyShop";
import {
  bestSellingQueryOptions,
  catalogQueryOptions,
  collectionsQueryOptions,
} from "@/lib/queries";
import { discountPercent, productInStock, type ShopifyProduct } from "@/lib/shopify";
import { displayCollections } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions());
    context.queryClient.prefetchQuery(collectionsQueryOptions());
    context.queryClient.prefetchQuery(bestSellingQueryOptions());
  },

  head: () => ({
    meta: [
      { title: "Space Cell — Premium Phones, Tablets & Audio" },
      {
        name: "description",
        content:
          "Space Cell stocks premium smartphones, tablets, smartwatches, audio and accessories with official warranty and secure Shopify checkout.",
      },
      { property: "og:title", content: "Space Cell — Premium Phones, Tablets & Audio" },
      {
        property: "og:description",
        content:
          "Premium smartphones, tablets, audio and accessories with official warranty and secure checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-4 sm:px-0">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link
          to={href as "/shop"}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Rail({ products }: { products: ShopifyProduct[] }) {
  return (
    <div className="scroll-rail flex gap-4 px-4 sm:px-0">
      {products.map((product) => (
        <div key={product.node.id} className="w-36 shrink-0 sm:w-44">
          <CompactProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

function Index() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections, isLoading: collectionsLoading } = useQuery(collectionsQueryOptions());
  const { data: bestSellers } = useQuery(bestSellingQueryOptions());

  const products = catalog.products;
  const inStock = products.filter(productInStock);
  const deals = products.filter(onSale);
  const newest = [...products].sort((a, b) =>
    (b.node.createdAt ?? "").localeCompare(a.node.createdAt ?? ""),
  );
  const hero = (deals.length > 0 ? deals : inStock.length > 0 ? inStock : products).slice(0, 5);
  const collectionList = displayCollections(collections ?? []);
  const best = (bestSellers ?? []).length > 0 ? bestSellers! : inStock;
  const productOfBrand = (slug: string) =>
    products.find((product) => catalog.brandOf.get(product.node.handle)?.slug === slug);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl space-y-12 py-4 sm:px-4 sm:py-8">
        {products.length === 0 ? (
          <div className="px-4">
            <ProductGrid
              products={[]}
              emptyTitle="No products found"
              emptyHint="Add a product in Shopify and it will appear here automatically — tell me the product name and price and I can create it for you."
            />
          </div>
        ) : (
          <>
            <HeroBanner products={hero} />

            <BenefitsBar />

            {catalog.categories.length > 0 && (
              <section>
                <SectionHeader
                  title="Shop by category"
                  subtitle="Categories are generated from your live Shopify catalogue"
                  href="/shop"
                />
                <div className="scroll-rail flex gap-3 px-4 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
                  {catalog.categories.map((category) => (
                    <Link
                      key={category.slug}
                      to="/category/$slug"
                      params={{ slug: category.slug }}
                      className="card-lift flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center shadow-card transition-all hover:border-primary sm:w-auto"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
                        {category.icon ? (
                          <category.icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-xs font-semibold leading-snug">
                        {category.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {category.count} item{category.count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <TopBrands brands={catalog.brands} />

            {best.length > 0 && (
              <section>
                <SectionHeader
                  title="Best sellers"
                  subtitle="Your top selling products, straight from Shopify"
                  href="/shop"
                />
                <Rail products={best.slice(0, 12)} />
              </section>
            )}

            <BrandBanners brands={catalog.brands} productOf={productOfBrand} />

            {deals.length > 0 && (
              <section>
                <SectionHeader
                  title="Today's deals"
                  subtitle="Live compare-at pricing from Shopify"
                  href="/shop"
                />
                <Rail products={deals.slice(0, 12)} />
              </section>
            )}

            <section>
              <SectionHeader
                title="New arrivals"
                subtitle="Newest products published in your store"
                href="/shop"
              />
              <Rail products={newest.slice(0, 12)} />
            </section>

            {collectionsLoading ? (
              <div className="px-4 sm:px-0">
                <div className="h-40 animate-pulse rounded-2xl bg-surface" />
              </div>
            ) : (
              collectionList.length > 0 && <CollectionSections collections={collectionList} />
            )}

            <section>
              <SectionHeader
                title="All products"
                subtitle={`${products.length} product${products.length === 1 ? "" : "s"} live from Shopify`}
                href="/shop"
              />
              <div className="px-4 sm:px-0">
                <ProductGrid products={products.slice(0, 12)} />
                {products.length > 12 && (
                  <div className="mt-6 flex justify-center">
                    <Link
                      to="/shop"
                      className="press inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Sparkles className="h-4 w-4" />
                      Browse the full catalogue
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <WhyShop />
            <Newsletter />
          </>
        )}
      </div>
    </StoreLayout>
  );
}
