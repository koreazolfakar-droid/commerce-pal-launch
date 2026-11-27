import { Loader2 } from "lucide-react";

export default function DashboardRouteFallback() {
  return (
    <div
      className="dashboard-route-skeleton min-h-[360px] space-y-6 rounded-2xl border border-border bg-card/70 p-5 sm:p-7"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard page"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Loading dashboard page…</span>
      </div>
      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="h-8 w-44 max-w-full rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 rounded-xl border border-border bg-muted/70" />
          ))}
        </div>
        <div className="h-52 rounded-xl border border-border bg-muted/70" />
      </div>
    </div>
  );
}
