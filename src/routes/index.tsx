import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { HeroPanel, HeroSideCard } from "@/components/Hero";
import {
  BenefitsBar,
  BrandRail,
  CategoryChips,
  CategorySidebar,
  PromoCards,
  ServicesStrip,
} from "@/components/HomeSections";
import { ProductCard } from "@/components/ProductCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCollections, fetchProducts } from "@/lib/shopify";

export const Route = createFileRoute("/")({
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

const BADGES = ["Best seller", "Popular", "New", "Editor's choice"];

function Index() {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["shopify-products"],
    queryFn: () => fetchProducts(30),
  });
  const { data: collections } = useQuery({
    queryKey: ["shopify-collections"],
    queryFn: () => fetchCollections(50),
    staleTime: 5 * 60 * 1000,
  });

  const handles = new Set((collections ?? []).map((collection) => collection.handle));
  const all = products ?? [];
  const slides = all.slice(0, 3);
  const sideProducts = all.slice(0, 3);
  const promoImages = Object.fromEntries(
    (collections ?? []).map((collection) => [collection.handle, collection.image?.url]),
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
            <div className="hidden lg:block">
              <CategorySidebar handles={handles} />
            </div>
            <div className="space-y-4">
              <CategoryChips handles={handles} />
              {isLoading ? (
                <div className="h-80 animate-pulse rounded-xl bg-surface" />
              ) : (
                <HeroPanel slides={slides} />
              )}
            </div>
            <div className="scroll-rail flex gap-3 lg:flex-col lg:overflow-visible">
              {isLoading
                ? [0, 1, 2].map((key) => (
                    <div key={key} className="h-28 w-64 shrink-0 animate-pulse rounded-xl bg-surface lg:w-auto" />
                  ))
                : sideProducts.map((product) => (
                    <HeroSideCard key={product.node.id} product={product} />
                  ))}
            </div>
          </div>
        </section>

        <BrandRail handles={handles} />

        <BenefitsBar />

        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Best sellers</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-80 animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-muted-foreground">
              We couldn't load products right now. Please try again.
            </p>
          ) : all.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No products found</p>
          ) : (
            <div className="scroll-rail flex gap-4 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
              {all.map((product, index) => (
                <div key={product.node.id} className="w-56 shrink-0 sm:w-64 lg:w-auto">
                  <ProductCard product={product} badge={BADGES[index % BADGES.length] ?? "New"} />
                </div>
              ))}
            </div>
          )}
        </section>

        <PromoCards handles={handles} images={promoImages} />

        <ServicesStrip />
      </main>

      <SiteFooter />
    </div>
  );
}
