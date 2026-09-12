import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { StoreLayout } from "@/components/StoreLayout";
import { buildShopifyBrands } from "@/lib/brandDirectory";
import { useLanguage } from "@/lib/i18n";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/brands")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
    ]);
  },
  head: () => ({
    meta: [
      { title: `Brands — ${STORE_NAME}` },
      {
        name: "description",
        content: `Browse all brands available at ${STORE_NAME}.`,
      },
      { property: "og:title", content: `Brands — ${STORE_NAME}` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/brands") },
    ],
    links: [canonicalLink("/brands")],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const { language } = useLanguage();
  const brands = buildShopifyBrands(catalog.brands, collections);

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10 lg:px-6">
        <header className="mb-7 max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {language === "ar" ? "كل البراندات" : "All Brands"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {language === "ar"
              ? "تصفح جميع البراندات المتوفرة في Space Call وانتقل مباشرة إلى منتجات كل علامة."
              : "Browse every brand available at Space Call and jump directly to its products."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              to="/brand/$slug"
              params={{ slug: brand.slug }}
              className="group flex min-h-36 flex-col items-center justify-between rounded-2xl border border-border/75 bg-card p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={brand.label}
            >
              <span className="grid min-h-20 w-full place-items-center rounded-xl bg-surface px-3">
                <BrandLogo
                  slug={brand.slug}
                  label={brand.label}
                  size={46}
                  wordmark
                  {...(brand.image ? { imageUrl: brand.image } : {})}
                />
              </span>
              <span className="mt-4 flex w-full items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-extrabold">{brand.label}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
