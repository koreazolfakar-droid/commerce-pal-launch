import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { CatalogView } from "@/components/CatalogView";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { StoreLayout } from "@/components/StoreLayout";
import { applyFilters, parseProductSearch, type ProductFilters } from "@/lib/filters";
import { allVendorProductsQueryOptions, catalogQueryOptions } from "@/lib/queries";
import {
  breadcrumbJsonLd,
  canonicalLink,
  cleanMetaDescription,
  itemListJsonLd,
  jsonLd,
  socialMeta,
} from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { buildCatalogIndex, type CatalogIndex } from "@/lib/taxonomy";
import type { StoreProduct } from "@/lib/storeTypes";

type BrandSeoRow = {
  seo_title: string | null;
  seo_description: string | null;
  description: string | null;
  cover_image_url: string | null;
};

async function fetchBrandSeo(slug: string): Promise<BrandSeoRow | null> {
  const { data, error } = await publicSupabase
    .from("cms_brands")
    .select("seo_title,seo_description,description,cover_image_url")
    .eq("slug", slug)
    .eq("is_visible", true)
    .maybeSingle();

  if (error) {
    console.warn(`Loading brand SEO metadata failed for ${slug}.`, error);
    return null;
  }
  return (data as BrandSeoRow | null) ?? null;
}

export const Route = createFileRoute("/brand/$slug")({
  validateSearch: parseProductSearch,
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions());
    const brand = catalog.brands.find((entry) => entry.slug === params.slug);
    if (!brand) throw notFound();

    const indexedProducts = catalog.products.filter(
      (product) => catalog.brandOf.get(product.node.handle)?.slug === params.slug,
    );

    const seoPromise = fetchBrandSeo(params.slug);
    let vendorProducts: StoreProduct[] = [];
    try {
      vendorProducts = await context.queryClient.ensureQueryData(
        allVendorProductsQueryOptions(brand.label),
      );
    } catch (error) {
      console.error(`Failed to fetch the complete ${brand.label} brand catalogue.`, error);
    }

    const uniqueProducts = new Map<string, StoreProduct>();
    for (const product of [...indexedProducts, ...vendorProducts]) {
      uniqueProducts.set(product.node.id, product);
    }
    const brandCatalog = buildCatalogIndex([...uniqueProducts.values()]);
    const seo = await seoPromise;

    return {
      label: brand.label,
      catalog: brandCatalog,
      seo,
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
    const title =
      loaderData.seo?.seo_title?.trim() ||
      `${label} Products in Lebanon | ${STORE_NAME}`;
    const fallbackDescription = `Shop ${label} phones, tablets, wearables, audio and accessories in Lebanon at ${STORE_NAME}, with live stock and direct Space Call checkout.`;
    const description = cleanMetaDescription(
      loaderData.seo?.seo_description || loaderData.seo?.description,
      fallbackDescription,
    );
    const path = `/brand/${params.slug}`;
    const hasProducts = loaderData.catalog.products.length > 0;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: hasProducts
            ? "index, follow, max-image-preview:large, max-snippet:-1"
            : "noindex, follow",
        },
        ...socialMeta({
          title,
          description,
          path,
          ...(loaderData.seo?.cover_image_url
            ? { image: loaderData.seo.cover_image_url }
            : {}),
        }),
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
        jsonLd(itemListJsonLd(`${label} products`, loaderData.catalog.products)),
      ],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { language } = useLanguage();
  const { slug } = Route.useParams();
  const { label: brandLabel, catalog: loaderCatalog } = Route.useLoaderData();
  const catalog = loaderCatalog as CatalogIndex;
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const inBrand = catalog.products.filter(
    (product: StoreProduct) => catalog.brandOf.get(product.node.handle)?.slug === slug,
  );
  const products = applyFilters(inBrand, catalog, filters);

  const categories = catalog.categories.filter((category: CatalogIndex["categories"][number]) =>
    inBrand.some((product: StoreProduct) =>
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
            ? `تصفح منتجات ${brandLabel} المتوفرة لدى Space Call، بما في ذلك الهواتف والأجهزة والإكسسوارات، مع مخزون مباشر وأسعار واضحة وإتمام طلب آمن.`
            : `Browse ${brandLabel} products available at Space Call, including phones, devices and accessories, with live availability, clear pricing and secure checkout.`}
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
