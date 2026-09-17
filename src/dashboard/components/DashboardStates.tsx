import { AlertCircle, RefreshCw } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-border/60 bg-card"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="h-[330px] animate-pulse rounded-2xl border border-border/60 bg-card xl:col-span-7" />
        <div className="h-[330px] animate-pulse rounded-2xl border border-border/60 bg-card xl:col-span-5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="h-[360px] animate-pulse rounded-2xl border border-border/60 bg-card xl:col-span-8" />
        <div className="h-[360px] animate-pulse rounded-2xl border border-border/60 bg-card xl:col-span-4" />
      </div>
    </div>
  );
}

export function DashboardErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[340px] place-items-center rounded-2xl border border-rose-200/70 bg-card p-8 text-center dark:border-rose-900/40">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-6" />
        </span>
        <p className="mt-4 text-sm font-black">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <RefreshCw className="size-3.5" /> {retryLabel}
        </button>
      </div>
    </div>
  );
}
