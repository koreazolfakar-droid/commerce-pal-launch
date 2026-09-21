import { CompactProductCard } from "@/components/CompactProductCard";
import { ProductListCard } from "@/components/ProductListCard";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode, type ProductViewMode } from "@/hooks/useProductViewMode";
import type { ShopifyProduct } from "@/lib/shopify";
import { useEffect, useRef, useState } from "react";

function useCompactGridVisibility(enabled: boolean) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(!enabled);

  useEffect(() => {
    if (!enabled || shouldRender) return;

    const node = railRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldRender(true);
        observer.disconnect();
      },
      {
        rootMargin: "700px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, shouldRender]);

  return { railRef, shouldRender };
}

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
  const deferCompactGrid = compactGrid && viewMode === "grid" && visible.length > 1;
  const { railRef, shouldRender } = useCompactGridVisibility(deferCompactGrid);

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
          ref={railRef}
          className="-mx-3.5 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-3.5 pb-1.5 pe-[10%] [overscroll-behavior-inline:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:pe-0 lg:grid-cols-4"
          role="list"
          aria-label="Products"
          aria-busy={shouldRender ? undefined : "true"}
        >
          {shouldRender ? (
            visible.map((product, index) => (
              <CompactProductCard
                key={product.node.id}
                product={product}
                listItem
                eager={index < 2}
                className="homepage-product-card w-[72%] shrink-0 snap-start transition-transform duration-150 ease-out active:scale-[0.99] sm:w-auto sm:shrink sm:snap-none sm:hover:-translate-y-0.5"
              />
            ))
          ) : (
            <div
              role="listitem"
              className="min-h-96 w-full shrink-0 sm:col-span-3 lg:col-span-4"
              aria-hidden="true"
            />
          )}
        </div>
      ) : (
        <div
          className={
            visible.length === 1 ? "mx-auto w-full max-w-sm" : "scroll-rail product-rail-items"
          }
        >
          {visible.map((product, index) => (
            <CompactProductCard
              key={product.node.id}
              product={product}
              eager={index < 2}
              className="homepage-product-card"
            />
          ))}
        </div>
      )}
    </div>
  );
}
