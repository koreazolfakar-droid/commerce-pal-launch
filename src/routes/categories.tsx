import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes } from "lucide-react";

import { StoreLayout } from "@/components/StoreLayout";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { catalogQueryOptions } from "@/lib/queries";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";

export const Route = createFileRoute("/categories")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions()),
  head: () => ({
    meta: [
      { title: `Categories — ${STORE_NAME}` },
      {
        name: "description",
        content: `Browse all product categories available at ${STORE_NAME}.`,
      },
      { property: "og:title", content: `Categories — ${STORE_NAME}` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/categories") },
    ],
    links: [canonicalLink("/categories")],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions());
  const { language } = useLanguage();

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10 lg:px-6">
        <header className="mb-7 max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {language === "ar" ? "كل التصنيفات" : "All Categories"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {language === "ar"
              ? "تصفح أقسام المتجر واختر الفئة المناسبة للوصول إلى المنتجات بسرعة."
              : "Browse every store category and jump directly to the products you need."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {catalog.categories.map((category) => {
            const CategoryIcon = category.icon ?? Boxes;
            const label = categoryLabel(category, language);
            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="group relative min-h-36 overflow-hidden rounded-2xl border border-border/75 bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-primary/[0.025]" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/10 bg-background/90 text-primary shadow-sm">
                    <CategoryIcon className="h-7 w-7" strokeWidth={1.65} aria-hidden="true" />
                  </span>
                  <div className="flex items-end justify-between gap-2">
                    <h2 className="text-sm font-extrabold leading-snug sm:text-base">{label}</h2>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </StoreLayout>
  );
}
