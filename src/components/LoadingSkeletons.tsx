/** Skeletons use the same horizontal geometry as the live product and brand rails.
 * This reserves media and copy space before deferred sections hydrate. */
export function ProductRailSkeleton() {
  return (
    <div className="product-rail min-w-0 overflow-hidden" aria-hidden="true" data-testid="product-rail-skeleton">
      <div className="scroll-rail product-rail-items product-swipe-rail">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="market-product-card homepage-product-card flex min-w-0 flex-col overflow-hidden border border-border/60 bg-card"
          >
            <div className="product-card-media market-product-media shimmer aspect-square w-full bg-image-stage" />
            <div className="product-card-body market-product-copy flex flex-1 flex-col gap-2 p-2.5">
              <div className="shimmer h-3 w-1/3 rounded bg-surface" />
              <div className="shimmer h-3.5 w-full rounded bg-surface" />
              <div className="shimmer h-3.5 w-4/5 rounded bg-surface" />
              <div className="shimmer mt-1 h-4 w-2/5 rounded bg-surface" />
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="shimmer h-3 w-1/3 rounded bg-surface" />
                <div className="shimmer size-9 rounded-full bg-surface" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandRailSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden">
      <div className="shimmer mb-3 h-5 w-32 rounded-md bg-surface" />
      <div className="flex gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="shimmer h-14 w-24 shrink-0 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
