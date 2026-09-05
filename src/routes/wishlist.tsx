import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { ProductGrid } from "@/components/ProductGrid";
import { StoreLayout } from "@/components/StoreLayout";
import { catalogQueryOptions } from "@/lib/queries";
import { useWishlistStore } from "@/stores/wishlistStore";

export const Route = createFileRoute("/wishlist")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Your wishlist — Space Cell" },
      {
        name: "description",
        content: "Saved products from the Space Cell store, with live Shopify prices and stock.",
      },
      { property: "og:title", content: "Your wishlist — Space Cell" },
      { property: "og:description", content: "Saved products with live prices and stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const handles = useWishlistStore((state) => state.handles);
  const saved = catalog.products.filter((product) => handles.includes(product.node.handle));

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {saved.length} saved product{saved.length === 1 ? "" : "s"}
        </p>

        {saved.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border bg-surface px-6 py-16 text-center">
            <Heart className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
            <Link
              to="/shop"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <ProductGrid products={saved} eagerCount={4} />
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
