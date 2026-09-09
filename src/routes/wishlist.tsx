import { useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { ProductGrid } from "@/components/ProductGrid";
import { StoreLayout } from "@/components/StoreLayout";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { useWishlistStore } from "@/stores/wishlistStore";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: `Your wishlist — ${STORE_NAME}` },
      {
        name: "description",
        content: `Saved products from the ${STORE_NAME} store, with live Shopify prices and stock.`,
      },
      { property: "og:title", content: `Your wishlist — ${STORE_NAME}` },
      { property: "og:description", content: "Saved products with live prices and stock." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/wishlist") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Your wishlist — ${STORE_NAME}` },
      { name: "twitter:description", content: "Saved products with live prices and stock." },
    ],
    links: [canonicalLink("/wishlist")],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { t } = useLanguage();
  const handles = useWishlistStore((state) => state.handles);
  const { data: saved = [] } = useQuery(productsByHandlesQueryOptions(handles));

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("wishlistTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {saved.length} {t("savedProducts")}
        </p>

        {saved.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border bg-surface px-6 py-16 text-center">
            <Heart aria-hidden className="h-12 w-12 text-muted-foreground/30" />
            <h2 className="mt-4 text-lg font-semibold">{t("wishlistEmpty")}</h2>
            <p className="text-sm text-muted-foreground">{t("wishlistEmptyDescription")}</p>
            <Link
              to="/shop"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              {t("browseProducts")}
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
