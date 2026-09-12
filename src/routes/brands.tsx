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
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-5 sm:py-10 lg:px-6">
        <header className="mb-6 max-w-2xl sm:mb-8">
          <h1 className="text-[2rem] font-black leading-none tracking-[-0.045em] sm:text-4xl">
            {language === "ar" ? "كل البراندات" : "All Brands"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {language === "ar"
              ? "تصفح جميع البراندات المتوفرة في Space Call وانتقل مباشرة إلى منتجات كل علامة."
              : "Browse every brand available at Space Call and jump directly to its products."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              to="/brand/$slug"
              params={{ slug: brand.slug }}
              className="group flex min-h-[12.25rem] flex-col rounded-[1.55rem] border border-border/70 bg-card p-3.5 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_34px_-22px_rgba(37,99,235,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-[12.75rem] sm:p-4"
              aria-label={brand.label}
            >
              <span className="grid h-[6.6rem] w-full place-items-center overflow-hidden rounded-[1.2rem] border border-black/[0.045] bg-white px-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.015)] sm:h-[7rem] dark:border-white/[0.08] dark:bg-white">
                <span className="grid h-full w-full place-items-center [&_img]:max-h-[64%] [&_img]:max-w-[82%] [&_img]:object-contain [&_svg]:max-h-[64%] [&_svg]:max-w-[82%]">
                  <BrandLogo
                    slug={brand.slug}
                    label={brand.label}
                    size={48}
                    wordmark
                    {...(brand.image ? { imageUrl: brand.image } : {})}
                  />
                </span>
              </span>

              <span className="mt-auto flex min-h-14 w-full items-end justify-between gap-3 pt-4">
                <span className="min-w-0 truncate text-[0.98rem] font-extrabold leading-none tracking-[-0.02em] text-foreground">
                  {brand.label}
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowRight className="h-[1.05rem] w-[1.05rem] rtl:rotate-180" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </StoreLayout>
  );
}
