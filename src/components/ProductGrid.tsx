import { PackageSearch } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import type { ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4";

/** Layout-stable skeleton that mirrors the real card geometry (no CLS on swap). */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="shimmer aspect-square w-full border-b bg-surface" />
          <div className="space-y-2.5 p-4">
            <div className="h-2.5 w-1/3 rounded-full bg-surface" />
            <div className="h-3.5 w-4/5 rounded-full bg-surface" />
            <div className="h-4 w-1/2 rounded-full bg-surface" />
            <div className="h-9 w-full rounded-xl bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({
  products,
  className,
  emptyTitle = "No products found",
  emptyHint = "Try removing a filter or browsing another category.",
  action,
  eagerCount = 0,
}: {
  products: ShopifyProduct[];
  className?: string;
  emptyTitle?: string;
  emptyHint?: string;
  action?: React.ReactNode;
  eagerCount?: number;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-muted-foreground">
          <PackageSearch className="h-5 w-5" />
        </span>
        <p className="mt-4 text-base font-semibold">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    );
  }

  return (
    <div className={cn(GRID, className)}>
      {products.map((product, index) => (
        <ProductCard key={product.node.id} product={product} eager={index < eagerCount} />
      ))}
    </div>
  );
}
