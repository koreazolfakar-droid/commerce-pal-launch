import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { CatalogView } from "@/components/CatalogView";
import { StoreLayout } from "@/components/StoreLayout";
import { useLanguage } from "@/lib/i18n";
import { usedPhoneProducts } from "@/lib/usedPhones";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections } from "@/lib/taxonomy";
import { cdnImage } from "@/lib/image";
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/used-phones")({
  validateSearch: parseProductSearch,
  loader: async ({ context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    void context.queryClient.prefetchQuery(collectionsQueryOptions());
    return { products: usedPhoneProducts(catalog.products) };
  },
  head: ({ loaderData }) => {
    const title = `Used Phones in Lebanon | ${STORE_NAME}`;
    const description = `Browse used, pre-owned and refurbished phones available from ${STORE_NAME} in Lebanon with live pricing and stock.`;
    const products = loaderData?.products ?? [];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: products.length
            ? "index, follow, max-image-preview:large, max-snippet:-1"
            : "noindex, follow",
        },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absoluteUrl("/used-phones") },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [canonicalLink("/used-phones")],
      scripts: products.length
        ? [
            jsonLd(
              breadcrumbJsonLd([
                { name: "Home", path: "/" },
                { name: "Used Phones", path: "/used-phones" },
              ]),
            ),
            jsonLd(itemListJsonLd("Used phones", products)),
          ]
        : [],
    };
  },
  component: UsedPhonesPage,
});

function UsedPhonesPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { t, language } = useLanguage();
  const used = usedPhoneProducts(catalog.products);
  const products = applyFilters(used, catalog, filters);
  const heroProduct = used[0];

  return (
    <StoreLayout>
      <CatalogView
        title={t("usedPhonesTitle")}
        description={`${used.length} ${used.length === 1 ? t("product") : t("products")} • ${t("usedPhonesDescription")}`}
        products={products}
        total={used.length}
        filters={filters}
        facets={{ brands: catalog.brands, collections: displayCollections(collections ?? []) }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        onChange={(patch: Partial<ProductFilters>) =>
          navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) })
        }
        onReset={() => navigate({ search: {} })}
        header={
          <section className="mb-6 overflow-hidden rounded-[1.75rem] border bg-hero text-hero-foreground shadow-card">
            <div className="grid items-center gap-5 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1fr_auto] lg:px-9">
              <div className={language === "ar" ? "text-right" : "text-start"}>
                <span className="inline-flex rounded-full border border-hero-border bg-white/5 px-3 py-1 text-[11px] font-bold tracking-wide text-primary">
                  {t("usedPhonesBadge")}
                </span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {t("usedPhonesTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-hero-muted">
                  {t("usedPhonesNote")}
                </p>
              </div>
              <div
                className="hidden h-28 w-28 overflow-hidden rounded-3xl border border-hero-border bg-white/5 p-2 lg:block"
                aria-hidden
              >
                {heroProduct?.node.images.edges[0]?.node.url ? (
                  <img
                    src={cdnImage(heroProduct.node.images.edges[0].node.url, 240)}
                    alt=""
                    className="h-full w-full object-contain"
                    width="240"
                    height="240"
                    loading="lazy"
                  />
                ) : null}
              </div>
            </div>
          </section>
        }
      />
    </StoreLayout>
  );
}
