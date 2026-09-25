import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { StoreLayout } from "@/components/StoreLayout";
import { applyCmsBrands, buildStoreBrands } from "@/lib/brandDirectory";
import { cmsSeoPage, fetchCmsSnapshot } from "@/lib/cms";
import { useLanguage } from "@/lib/i18n";
import { catalogQueryOptions } from "@/lib/queries";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, canonicalUrl, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/brands")({
  loader: async ({ context }) => {
    const [catalog, cms] = await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      fetchCmsSnapshot(),
    ]);
    return { catalog, cms };
  },
  head: ({ loaderData }) => {
    const seo = loaderData ? cmsSeoPage(loaderData.cms, "brands") : undefined;
    const title =
      seo?.title?.trim() || `Electronics Brands in Lebanon | ${STORE_NAME}`;
    const description =
      seo?.description?.trim() ||
      `Browse smartphone, tablet, laptop, audio, gaming and electronics brands available from ${STORE_NAME} in Lebanon.`;
    const canonical = canonicalUrl("/brands", seo?.canonical_url);
    const image = seo?.og_image_url?.trim();

    const brands = loaderData?.catalog.brands ?? [];

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content:
            seo?.robots?.trim() ||
            (brands.length
              ? "index, follow, max-image-preview:large, max-snippet:-1"
              : "noindex, follow"),
        },
        ...socialMeta({
          title,
          description,
          path: "/brands",
          ...(image ? { image } : {}),
        }),
      ],
      links: [canonicalLink("/brands", canonical)],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Brands", path: "/brands" },
          ]),
        ),
        ...(brands.length
          ? [
              jsonLd({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: `${STORE_NAME} brands`,
                numberOfItems: brands.length,
                itemListElement: brands.map((brand, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: brand.label,
                  url: absoluteUrl(`/brand/${encodeURIComponent(brand.slug)}`),
                })),
              }),
            ]
          : []),
      ],
    };
  },
  component: BrandsPage,
});

function BrandsPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { cms } = Route.useLoaderData();
  const { language } = useLanguage();
  const brands = applyCmsBrands(buildStoreBrands(catalog.brands, undefined), cms.brands);

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-5 sm:py-10 lg:px-6">
        <header className="mb-6 max-w-2xl sm:mb-8">
          <h1 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.025em] sm:text-4xl">
            {language === "ar" ? "كل البراندات" : "All Brands"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {language === "ar"
              ? "تصفح جميع البراندات المتوفرة في Space Call وانتقل مباشرة إلى منتجات كل علامة."
              : "Browse every brand available at Space Call and jump directly to its products."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {brands.map((brand) => {
            const href = brand.href || `/brand/${brand.slug}`;
            return (
              <a
                key={brand.slug}
                href={href}
                className="group flex min-h-[11.75rem] flex-col rounded-[1.55rem] border border-border/70 bg-card p-3.5 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_34px_-22px_rgba(37,99,235,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-[12.25rem] sm:p-4"
                aria-label={brand.label}
              >
                <span className="grid h-[6.25rem] w-full place-items-center overflow-hidden rounded-[1.2rem] border border-black/[0.045] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.015)] sm:h-[6.75rem] sm:p-3.5 dark:border-white/[0.08] dark:bg-white">
                  <span className="flex h-full w-full items-center justify-center overflow-hidden">
                    <BrandLogo
                      slug={brand.slug}
                      label={brand.label}
                      size={56}
                      wordmark
                      className="!h-[3.5rem] !w-full !max-w-[10rem] !rounded-none !bg-transparent [&>img]:!h-full [&>img]:!w-full [&>img]:!object-contain"
                      {...(brand.image ? { imageUrl: brand.image } : {})}
                    />
                  </span>
                </span>

                <span className="mt-auto flex min-h-12 w-full items-end justify-between gap-3 pt-3.5">
                  <span className="min-w-0 truncate text-[0.98rem] font-semibold leading-[1.2] tracking-[-0.012em] text-foreground">
                    {brand.label}
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRight
                      className="h-[1.05rem] w-[1.05rem] rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </StoreLayout>
  );
}
