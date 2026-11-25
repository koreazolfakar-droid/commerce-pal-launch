import { ProductGrid } from "@/components/ProductGrid";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode } from "@/hooks/useProductViewMode";
import { useLanguage } from "@/lib/i18n";
import { buildProductSuggestions } from "@/lib/productPresentation";
import { recommendationsQueryOptions, vendorProductsQueryOptions } from "@/lib/queries";
import type { StoreProduct } from "@/lib/storeTypes";
import type { primaryCategory, resolveBrand } from "@/lib/taxonomy";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export default function ProductSuggestions({
  product,
  brand,
  category,
}: {
  product: StoreProduct;
  brand: ReturnType<typeof resolveBrand>;
  category: ReturnType<typeof primaryCategory>;
}) {
  const { t, language } = useLanguage();
  const [recommendationViewMode, setRecommendationViewMode] = useProductViewMode();
  const vendor = product.node.vendor ?? "";
  const recommended = useQuery(recommendationsQueryOptions(product.node.handle));
  const vendorProducts = useQuery(vendorProductsQueryOptions(vendor));

  if (recommended.isPending || (vendor.trim() && vendorProducts.isPending)) return null;

  const { similar, sameVendor } = buildProductSuggestions({
    current: product,
    recommendations: recommended.data,
    vendorProducts: vendorProducts.data,
  });

  return (
    <>
      {similar.length > 0 && (
        <section
          className="mt-7 border-t border-border/60 pt-6 sm:mt-12 sm:pt-8"
          aria-labelledby="similar-products"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 sm:mb-5">
            <div className="min-w-0">
              <h2 id="similar-products" className="text-xl font-semibold tracking-tight">
                {sameVendor.length
                  ? language === "ar"
                    ? "منتجات قد تعجبك"
                    : "You may also like"
                  : language === "ar"
                    ? "بدائل من الفئة نفسها"
                    : "Alternatives in this category"}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {category && (
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  {t("viewAll")} <ChevronRight aria-hidden className="h-4 w-4 rtl:rotate-180" />
                </Link>
              )}
              <ProductViewToggle
                mode={recommendationViewMode}
                onChange={setRecommendationViewMode}
              />
            </div>
          </div>
          <ProductGrid
            products={similar}
            viewMode={recommendationViewMode}
            onViewModeChange={setRecommendationViewMode}
            showViewToggle={false}
          />
        </section>
      )}

      {sameVendor.length > 0 && (
        <section
          className="mt-7 border-t border-border/60 pt-6 sm:mt-12 sm:pt-8"
          aria-labelledby="more-from-brand"
        >
          <div className="home-section-header">
            <h2 id="more-from-brand" className="min-w-0 break-words text-xl font-semibold">
              {t("moreFromBrand")} {brand?.label}
            </h2>
            {brand && (
              <Link
                to="/brand/$slug"
                params={{ slug: brand.slug }}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                {t("viewAll")}
              </Link>
            )}
          </div>
          <ProductGrid
            products={sameVendor}
            viewMode={recommendationViewMode}
            showViewToggle={false}
          />
        </section>
      )}
    </>
  );
}
