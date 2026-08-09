import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts } from "@/lib/shopify";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Space Cell — Phones, Tablets & Accessories" },
      {
        name: "description",
        content:
          "Space Cell stocks the latest phones, tablets and accessories with fast, secure Shopify checkout.",
      },
      { property: "og:title", content: "Space Cell — Phones, Tablets & Accessories" },
      {
        property: "og:description",
        content: "The latest phones, tablets and accessories with secure Shopify checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["shopify-products"],
    queryFn: () => fetchProducts(30),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
              S
            </span>
            <span className="text-lg font-semibold tracking-tight">Space Cell</span>
          </a>
          <CartDrawer />
        </div>
      </header>

      <main>
        <section className="border-b bg-gradient-to-b from-card to-background">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Space Cell
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Tech that keeps up with you.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Phones, tablets and accessories — handpicked, in stock, and checked out securely
              through Shopify.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight">Shop all</h2>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="py-20 text-center text-muted-foreground">
              We couldn't load products right now. Please try again.
            </p>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-muted-foreground">No products found</p>
          )}
        </section>
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Space Cell. Secure checkout powered by Shopify.
        </div>
      </footer>
    </div>
  );
}
