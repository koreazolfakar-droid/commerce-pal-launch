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
      ) : compactGrid && visible.length > 1 ? (
        <div
          className="-mx-3.5 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-3.5 pb-1.5 pe-[10%] [overscroll-behavior-inline:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:pe-0 lg:grid-cols-4"
          role="list"
          aria-label="Products"
        >
          {visible.map((product) => (
            <CompactProductCard
              key={product.node.id}
              product={product}
              className="homepage-product-card w-[72%] shrink-0 snap-start transition-transform duration-150 ease-out active:scale-[0.99] sm:w-auto sm:shrink sm:snap-none sm:hover:-translate-y-0.5"
            />
          ))}
        </div>
      ) : (
        <div
          className={
            visible.length === 1
              ? "mx-auto w-full max-w-sm"
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
