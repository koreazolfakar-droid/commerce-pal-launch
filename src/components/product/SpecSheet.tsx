import type { SpecGroup } from "@/lib/productContent";

/**
 * Grouped specification sheet. Rows come only from real catalog data; the
 * layout stacks on mobile and becomes a two-column label/value grid on wider
 * screens, so long values never break the page width.
 */
export function SpecSheet({ groups }: { groups: SpecGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <details
          key={group.title}
          className="group overflow-hidden rounded-xl border bg-card"
          open={groups.length === 1 ? true : undefined}
        >
          <summary
            className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-semibold text-foreground marker:hidden"
          >
            {group.title}<span aria-hidden className="text-muted-foreground group-open:rotate-180">⌄</span>
          </summary>
          <dl className="divide-y">
            {group.rows.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="grid gap-0.5 px-4 py-3 text-sm sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-4"
              >
                <dt className="min-w-0 text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 break-words font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  );
}
