import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { CatalogView } from "@/components/CatalogView";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { allVendorProductsQueryOptions, catalogQueryOptions } from "@/lib/queries";
import { breadcrumbJsonLd, canonicalLink, itemListJsonLd, jsonLd, socialMeta } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { buildCatalogIndex, type CatalogIndex } from "@/lib/taxonomy";
import type { ShopifyProduct } from "@/lib/shopify";

export const Route = createFileRoute("/brand/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    const brand = catalog.brands.find((entry) => entry.slug === params.slug);
    if (!brand) throw notFound();

    const indexedProducts = catalog.products.filter(
      (product) => catalog.brandOf.get(product.node.handle)?.slug === params.slug,
    );

    let vendorProducts: ShopifyProduct[] = [];
    try {
      vendorProducts = await context.queryClient.ensureQueryData(
        allVendorProductsQueryOptions(brand.label),
      );
    } catch (error) {
      console.error(`Failed to fetch the complete ${brand.label} brand catalogue.`, error);
    }

    const uniqueProducts = new Map<string, ShopifyProduct>();
    for (const product of [...indexedProducts, ...vendorProducts]) {
      uniqueProducts.set(product.node.id, product);
    }
    // Route loader data must stay transport-safe. CatalogIndex contains derived
    // Maps and Lucide React icon components, so serialize only the source products
    // and rebuild the index inside the route component.
    return {
      label: brand.label,
      products: [...uniqueProducts.values()],
    };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Brand unavailable — ${STORE_NAME}` },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const label = loaderData.label ?? params.slug.replace(/-/g, " ");
    const title = `${label} Products in Lebanon | ${STORE_NAME}`;
    const description = `Shop ${label} phones, tablets, wearables, audio and accessories in Lebanon at ${STORE_NAME}, with live stock and secure Space Call ordering.`;
    const path = `/brand/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        ...socialMeta({ title, description, path }),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Brands", path: "/brands" },
            { name: label, path },
          ]),
        ),
        jsonLd(itemListJsonLd(`${label} products`, loaderData.products)),
      ],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { language } = useLanguage();
  const { slug } = Route.useParams();
  const { label: brandLabel, products: loaderProducts } = Route.useLoaderData();
  const catalog = buildCatalogIndex(loaderProducts);
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const inBrand = catalog.products.filter(
    (product: ShopifyProduct) => catalog.brandOf.get(product.node.handle)?.slug === slug,
  );
  const products = applyFilters(inBrand, catalog, filters);

  const categories = catalog.categories.filter((category: CatalogIndex["categories"][number]) =>
    inBrand.some((product: ShopifyProduct) =>
      (catalog.categoryOf.get(product.node.handle) ?? []).includes(category.slug),
    ),
  );

  const header = (
    <div className="mb-6 space-y-4">
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
          {language === "ar"
            ? `تسوّق منتجات ${brandLabel} في لبنان`
            : `Shop ${brandLabel} in Lebanon`}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {language === "ar"
            ? `تصفح منتجات ${brandLabel} المتوفرة لدى Space Call، بما في ذلك الهواتف والأجهزة والإكسسوارات، مع مخزون مباشر وأسعار واضحة وطلب آمن عبر Space Call.`
            : `Browse ${brandLabel} products available at Space Call, including phones, devices and accessories, with live availability, clear pricing and secure Space Call ordering.`}
        </p>
      </div>
      {categories.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Brand categories">
          {categories.map((category: CatalogIndex["categories"][number]) => (
            <button
              key={category.slug}
              type="button"
              onClick={() =>
                navigate({
                  search: (prev: ProductFilters) => ({ ...prev, category: [category.slug] }),
                })
              }
              aria-pressed={filters.category?.includes(category.slug) ?? false}
              className="min-h-10 rounded-full border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-primary aria-pressed:border-primary aria-pressed:bg-accent"
            >
              {categoryLabel(category, language)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <StoreLayout>
      <CatalogView
        title={`${brandLabel} products`}
        description={`${inBrand.length} product${inBrand.length === 1 ? "" : "s"} from ${brandLabel} available in the live catalogue.`}
        products={products}
        total={inBrand.length}
        filters={filters}
        facets={{ categories }}
        priceMin={catalog.priceMin}
        priceMax={catalog.priceMax}
        currency={catalog.currency}
        header={header}
        onChange={(patch: Partial<ProductFilters>) =>
          navigate({ search: (prev: ProductFilters) => ({ ...prev, ...patch }) })
        }
        onReset={() => navigate({ search: {} })}
      />
    </StoreLayout>
  );
}
