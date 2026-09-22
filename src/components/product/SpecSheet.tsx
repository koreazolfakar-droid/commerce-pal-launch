import type { SpecGroup } from "@/lib/productContent";

/**
 * Grouped specification sheet. Rows come only from real Shopify data; the
 * layout stacks on mobile and becomes a two-column label/value grid on wider
 * screens, so long values never break the page width.
 */
export function SpecSheet({ groups }: { groups: SpecGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="gap-4 space-y-4 md:columns-2 md:space-y-0 [&>section]:mb-4 [&>section]:break-inside-avoid">
      {groups.map((group) => (
        <section
          key={group.title}
          className="overflow-hidden rounded-lg border bg-card shadow-card"
          aria-labelledby={`spec-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
        >
          <h3
            id={`spec-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
            className="border-b bg-surface px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            {group.title}
          </h3>
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
        </section>
      ))}
    </div>
  );
}
