import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { BottomNav } from "@/components/BottomNav";
import { CollectionSections } from "@/components/CollectionSections";
import { CompactProductCard } from "@/components/CompactProductCard";
import { BenefitsBar } from "@/components/HomeSections";
import { MobileTopBar } from "@/components/MobileTopBar";
import { ProductCard } from "@/components/ProductCard";
import { PromoBanner } from "@/components/PromoBanner";
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

function Index() {
  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["shopify-products"],
    queryFn: () => fetchProducts(30),
  });
  const { data: collections } = useQuery({
    queryKey: ["shopify-collections"],
    queryFn: () => fetchCollections(50),
    staleTime: 5 * 60 * 1000,
  });

  const all = products ?? [];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>
      <MobileTopBar />

      <main className="mx-auto max-w-5xl space-y-8 py-4">
        {isLoading ? (
          <div className="px-4">
            <div className="h-44 animate-pulse rounded-2xl bg-surface" />
          </div>
        ) : (
          <PromoBanner products={all.slice(0, 4)} />
        )}

        {all.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between px-4">
              <h2 className="text-base font-semibold tracking-tight">Popular right now</h2>
              <Link to="/collections" className="text-xs font-medium text-primary">
                View all
              </Link>
            </div>
            <div className="scroll-rail flex gap-4 px-4">
              {all.slice(0, 10).map((product) => (
                <div key={product.node.id} className="w-32 shrink-0 sm:w-36">
                  <CompactProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        <CollectionSections collections={collections ?? []} />

        <section>
          <h2 className="mb-3 px-4 text-base font-semibold tracking-tight">All products</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-72 animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              We couldn&apos;t load products right now. Please try again.
            </p>
          ) : all.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No products found</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
              {all.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <BenefitsBar />
      </main>

      <div className="hidden lg:block">
        <SiteFooter />
      </div>
      <BottomNav active="home" />
    </div>
  );
}
