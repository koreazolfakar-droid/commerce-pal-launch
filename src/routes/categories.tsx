import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CategoryGlyph } from "@/components/CategoryGlyph";
import { StoreLayout } from "@/components/StoreLayout";
import { findCategoryArtworkCollection } from "@/lib/categoryArtwork";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { cdnImage } from "@/lib/image";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  canonicalLink,
  jsonLd,
  socialMeta,
} from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/categories")({
  loader: async ({ context }) => {
    const [catalog] = await Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions()),
      context.queryClient.ensureQueryData(collectionsQueryOptions()),
    ]);

    return {
      categories: catalog.categories.map((category) => ({
        slug: category.slug,
        label: category.label,
      })),
    };
  },
  head: ({ loaderData }) => {
    const title = `Phone & Electronics Categories in Lebanon | ${STORE_NAME}`;
    const description = `Browse smartphones, tablets, laptops, audio, wearables, chargers and accessories categories available in Lebanon at ${STORE_NAME}.`;
    const path = "/categories";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1",
        },
        ...socialMeta({ title, description, path }),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Categories", path },
          ]),
        ),
        ...(loaderData
          ? [
              jsonLd({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: "Electronics categories available at Space Call",
                numberOfItems: loaderData.categories.length,
                itemListElement: loaderData.categories.slice(0, 100).map((category, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: category.label,
                  url: absoluteUrl(`/category/${encodeURIComponent(category.slug)}`),
                })),
              }),
            ]
          : []),
      ],
    };
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { data: collections = [] } = useSuspenseQuery(collectionsQueryOptions());
  const { language } = useLanguage();

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:py-9 lg:px-6">
        <header className="mb-6 max-w-2xl sm:mb-8">
          <h1 className="text-2xl font-black tracking-[-0.035em] sm:text-4xl">
            {language === "ar" ? "كل التصنيفات" : "All Categories"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:text-base">
            {language === "ar"
              ? "اختر الفئة للوصول إلى المنتجات بسرعة."
              : "Choose a category and jump straight to the products you need."}
          </p>
        </header>

        <div
          className="grid grid-cols-3 gap-x-2 gap-y-4 min-[480px]:grid-cols-4 sm:grid-cols-5 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-7 xl:grid-cols-8"
          role="list"
          aria-label={language === "ar" ? "تصنيفات المتجر" : "Store categories"}
        >
          {catalog.categories.map((category) => {
            const label = categoryLabel(category, language);
            const artwork = findCategoryArtworkCollection(
              collections,
              category.slug,
              category.label,
            );
            const imageUrl = cdnImage(artwork?.image?.url, 240);

            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                role="listitem"
                aria-label={label}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1.5 py-2 text-center transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:gap-2.5 sm:px-2"
              >
                <span
                  className="relative grid h-[4.6rem] w-[4.6rem] shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-card transition duration-300 group-hover:border-primary/25 group-hover:shadow-card-hover sm:h-[5.3rem] sm:w-[5.3rem] sm:rounded-[1.55rem]"
                  aria-hidden="true"
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 dark:from-card dark:via-card dark:to-surface" />
                  <span className="pointer-events-none absolute inset-x-3 top-1 h-px bg-white/80 dark:bg-white/10" />
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={label}
                      loading="lazy"
                      decoding="async"
                      className="relative h-full w-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                    />
                  ) : (
                    <CategoryGlyph
                      slug={category.slug}
                      className="relative h-[4.1rem] w-[4.1rem] transition-transform duration-300 ease-out group-hover:scale-[1.06] sm:h-[4.75rem] sm:w-[4.75rem]"
                    />
                  )}
                </span>

                <h2 className="line-clamp-2 min-h-[2rem] max-w-full text-[11px] font-extrabold leading-[1.15] tracking-[-0.015em] text-foreground transition-colors group-hover:text-primary sm:min-h-[2.15rem] sm:text-xs">
                  {label}
                </h2>
              </Link>
            );
          })}
        </div>
      </div>
    </StoreLayout>
  );
}
