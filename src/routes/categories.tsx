import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CategoryGlyph } from "@/components/CategoryGlyph";
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
            const label = categoryLabel(category, language);
            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="group relative min-h-36 overflow-hidden rounded-2xl border border-border/75 bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.10] via-transparent to-cyan-400/[0.05] dark:from-primary/[0.16] dark:to-cyan-400/[0.06]" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                  <span className="grid h-16 w-16 place-items-center rounded-[1.25rem] border border-primary/15 bg-background/90 text-primary shadow-sm ring-1 ring-inset ring-white/5 transition-transform duration-300 group-hover:scale-105 dark:bg-black/20">
                    <CategoryGlyph slug={category.slug} className="h-9 w-9" />
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
