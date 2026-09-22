import { CompactProductCard } from "@/components/CompactProductCard";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode, type ProductViewMode } from "@/hooks/useProductViewMode";
import type { ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

/**
 * Shared storefront product layout.
 *
 * Dense and grid modes are real CSS grids, not horizontal carousels:
 * - dense: 3 columns on mobile
 * - grid: 2 columns on mobile
 */
export function ProductRail({
  products,
  storageKey,
  viewMode: controlledViewMode,
  onViewModeChange,
  showViewToggle = true,
  compactGrid = false,
}: {
  products: ShopifyProduct[];
  storageKey: string;
  viewMode?: ProductViewMode;
  onViewModeChange?: (mode: ProductViewMode) => void;
  showViewToggle?: boolean;
  compactGrid?: boolean;
}) {
  const [storedViewMode, setStoredViewMode] = useProductViewMode("grid", storageKey);
  const viewMode = controlledViewMode ?? storedViewMode;
  const setViewMode = onViewModeChange ?? setStoredViewMode;

  const gridProducts = products.slice(0, 6);

  return (
    <div className="product-rail">
      {showViewToggle && (
        <div className="mb-2 flex justify-end">
          <ProductViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      )}

      <div
        className={cn(
          "product-static-grid grid min-w-0 items-stretch",
          viewMode === "dense"
            ? "grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5"
            : "grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
        )}
        role="list"
        aria-label="Products"
        data-product-layout={viewMode}
      >
        {gridProducts.map((product, index) => (
          <CompactProductCard
            key={product.node.id}
            product={product}
            listItem
            eager={index < 3}
            market
            className={cn("homepage-product-card", viewMode === "dense" && "dense-product-card")}
          />
        ))}
      </div>
    </div>
  );
}
