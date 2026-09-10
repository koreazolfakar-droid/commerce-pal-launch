import { CompactProductCard } from "@/components/CompactProductCard";
import { ProductListCard } from "@/components/ProductListCard";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode } from "@/hooks/useProductViewMode";
import type { ShopifyProduct } from "@/lib/shopify";

/** One responsive layout, including rails nested inside half-width bundle cards. */
export function ProductRail({
  products,
  storageKey,
}: {
  products: ShopifyProduct[];
  storageKey: string;
}) {
  const [viewMode, setViewMode] = useProductViewMode("grid", storageKey);
  const visible = products.slice(0, 10);

  return (
    <div className="product-rail">
      <div className="mb-2 flex justify-end">
        <ProductViewToggle mode={viewMode} onChange={setViewMode} />
      </div>
      {viewMode === "list" ? (
        <div className="grid min-w-0 gap-2">
          {visible.map((product) => (
            <ProductListCard key={product.node.id} product={product} />
          ))}
        </div>
      ) : (
        <div
          className={
            visible.length === 1 ? "mx-auto w-full max-w-sm" : "scroll-rail product-rail-items"
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
