import { PackageSearch } from "lucide-react";

import { CompactProductCard } from "@/components/CompactProductCard";
import { ProductViewToggle } from "@/components/ProductViewToggle";
import { useProductViewMode, type ProductViewMode } from "@/hooks/useProductViewMode";
import type { StoreProduct } from "@/lib/storeTypes";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

const DENSE = "grid grid-cols-3 gap-x-2 gap-y-4 sm:gap-4 md:grid-cols-4 xl:grid-cols-5";
const GRID = "grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-6 md:grid-cols-3 xl:grid-cols-4";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={DENSE} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-w-0">
          <div className="shimmer aspect-square w-full rounded-xl bg-surface" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-1/2 rounded-full bg-surface" />
            <div className="h-3 w-full rounded-full bg-surface" />
            <div className="h-3 w-3/4 rounded-full bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({
  products,
  className,
  emptyTitle,
  emptyHint,
  action,
  eagerCount = 0,
  showViewToggle = true,
  viewMode: controlledViewMode,
  onViewModeChange,
}: {
  products: StoreProduct[];
  className?: string;
  emptyTitle?: string;
  emptyHint?: string;
  action?: React.ReactNode;
  eagerCount?: number;
  showViewToggle?: boolean;
  viewMode?: ProductViewMode;
  onViewModeChange?: (mode: ProductViewMode) => void;
}) {
  const [storedViewMode, setStoredViewMode] = useProductViewMode();
  const { t } = useLanguage();
  const viewMode = controlledViewMode ?? storedViewMode;
  const setViewMode = onViewModeChange ?? setStoredViewMode;

  const resolvedEmptyTitle = emptyTitle ?? t("noProducts");
  const resolvedEmptyHint = emptyHint ?? t("tryAnother");

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-muted-foreground">
          <PackageSearch className="h-5 w-5" />
        </span>
        <p className="mt-4 text-base font-semibold">{resolvedEmptyTitle}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{resolvedEmptyHint}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {showViewToggle && (
        <div className="mb-3 flex items-center justify-end">
          <ProductViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      )}
      <div
        className={cn(viewMode === "dense" ? DENSE : GRID, className)}
      >
        {products.map((product, index) => (
          <CompactProductCard
            key={product.node.id}
            product={product}
            eager={index < eagerCount}
            borderless
            className={viewMode === "dense" ? "catalog-dense-product-card dense-product-card" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
