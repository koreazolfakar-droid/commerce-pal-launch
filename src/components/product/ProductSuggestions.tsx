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
import "./product-suggestions.css";

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
        <section className="product-suggestions-section" aria-labelledby="similar-products">
          <div className="product-suggestions-heading">
            <h2 id="similar-products" className="product-suggestions-title">
              {sameVendor.length
                ? language === "ar"
                  ? "منتجات قد تعجبك"
                  : "You may also like"
                : language === "ar"
                  ? "بدائل من الفئة نفسها"
                  : "Alternatives in this category"}
            </h2>
            <div className="product-suggestions-controls">
              {category && (
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="product-suggestions-link"
                >
                  {t("viewAll")}
                  <ChevronRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.7} />
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
            recommendation
            className="product-suggestions-grid"
          />
        </section>
      )}

      {sameVendor.length > 0 && (
        <section className="product-suggestions-section" aria-labelledby="more-from-brand">
          <div className="product-suggestions-heading">
            <h2 id="more-from-brand" className="product-suggestions-title">
              {t("moreFromBrand")} {brand?.label}
            </h2>
            {brand && (
              <Link
                to="/brand/$slug"
                params={{ slug: brand.slug }}
                className="product-suggestions-link"
              >
                {t("viewAll")}
                <ChevronRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.7} />
              </Link>
            )}
          </div>
          <ProductGrid
            products={sameVendor}
            viewMode={recommendationViewMode}
            showViewToggle={false}
            recommendation
            className="product-suggestions-grid"
          />
        </section>
      )}
    </>
  );
}
