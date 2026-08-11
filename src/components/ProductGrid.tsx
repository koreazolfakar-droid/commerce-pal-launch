import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border bg-card p-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-5 w-1/2" />
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
}: {
  products: ShopifyProduct[];
  className?: string;
  emptyTitle?: string;
  emptyHint?: string;
  action?: React.ReactNode;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <p className="text-base font-semibold">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.node.id} product={product} />
      ))}
    </div>
  );
}
