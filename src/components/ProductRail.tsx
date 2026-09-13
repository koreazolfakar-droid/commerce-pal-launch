import { CompactProductCard } from "@/components/CompactProductCard";
import { ProductListCard } from "@/components/ProductListCard";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode, type ProductViewMode } from "@/hooks/useProductViewMode";
import type { ShopifyProduct } from "@/lib/shopify";

/** One responsive layout, including rails nested inside half-width bundle cards. */
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
  const visible = products.slice(0, compactGrid ? 4 : 10);

  return (
    <div className="product-rail">
      {showViewToggle && (
        <div className="mb-2 flex justify-end">
          <ProductViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      )}
      {viewMode === "list" ? (
        <div className="grid min-w-0 gap-2.5">
          {visible.map((product) => (
            <ProductListCard key={product.node.id} product={product} />
          ))}
        </div>
      ) : (
        <div
          className={
            visible.length === 1
              ? "mx-auto w-full max-w-sm"
              : compactGrid
                ? "grid grid-cols-2 gap-2.5 py-0.5 sm:grid-cols-3 lg:grid-cols-4"
                : "scroll-rail product-rail-items"
          }
        >
          {visible.map((product) => (
            <CompactProductCard
              key={product.node.id}
              product={product}
              className="homepage-product-card"
            />
          ))}
        </div>
      )}
    </div>
  );
}
