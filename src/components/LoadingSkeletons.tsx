/** Placeholders preserve the shape of the content without exposing fake products. */
export function ProductRailSkeleton() {
  return (
    <div className="overflow-hidden" aria-hidden="true">
      <div className="mb-3 h-5 w-36 rounded-md bg-surface shimmer" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={index === 3 ? "hidden lg:block" : index === 2 ? "hidden sm:block" : undefined}>
            <div className="shimmer aspect-square rounded-xl bg-surface" />
            <div className="mt-3 space-y-2">
              <div className="shimmer h-3 w-4/5 rounded bg-surface" />
              <div className="shimmer h-3 w-2/3 rounded bg-surface" />
              <div className="shimmer h-4 w-1/3 rounded bg-surface" />
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
