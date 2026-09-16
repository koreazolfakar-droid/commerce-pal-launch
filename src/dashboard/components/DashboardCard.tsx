import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(15,23,42,0.035)]",
        className,
      )}
      {...props}
    >
      {children}
    </article>
  );
}
