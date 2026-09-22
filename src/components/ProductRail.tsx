import { CompactProductCard } from "@/components/CompactProductCard";
import type { ProductViewMode } from "@/hooks/useProductViewMode";
import type { ShopifyProduct } from "@/lib/shopify";

/**
 * Shared storefront product rail.
 *
 * Product sections stay horizontally swipeable on every viewport. A small
 * trailing peek communicates that more products are available without adding
 * extra controls or changing the product-card purchase experience.
 */
export function ProductRail({
  products,
  compactGrid = false,
}: {
  products: ShopifyProduct[];
  storageKey: string;
  viewMode?: ProductViewMode;
  onViewModeChange?: (mode: ProductViewMode) => void;
  showViewToggle?: boolean;
  compactGrid?: boolean;
}) {
  const visible = products.slice(0, compactGrid ? 6 : 10);

  if (visible.length === 0) return null;

  return (
    <div className="product-rail min-w-0">
      <div
        className={
          visible.length === 1
            ? "mx-auto w-full max-w-sm"
            : "scroll-rail product-rail-items product-swipe-rail"
        }
        role="list"
        aria-label="Products"
        data-product-layout="swipe"
      >
        {visible.map((product, index) => (
          <CompactProductCard
            key={product.node.id}
            product={product}
            listItem
            eager={index < 3}
            market
            className="homepage-product-card snap-start"
          />
        ))}
      </div>
    </div>
  );
}
