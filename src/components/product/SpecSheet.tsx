import type { SpecGroup } from "@/lib/productContent";

const GROUP_TRANSLATIONS: Record<string, string> = {
  "Specifications": "المواصفات",
  "Display": "الشاشة",
  "Performance": "الأداء",
  "Memory & Storage": "الذاكرة والتخزين",
  "Camera": "الكاميرا",
  "Battery & Charging": "البطارية والشحن",
  "Connectivity": "الاتصالات",
  "Audio": "الصوت",
  "Design & Build": "التصميم",
  "Software & Features": "النظام والميزات",
  "Power & Compatibility": "الطاقة والتوافق",
  "More details": "تفاصيل أخرى",
};

export function SpecSheet({
  groups,
  language = "en",
}: {
  groups: SpecGroup[];
  language?: "ar" | "en";
}) {
  if (groups.length === 0) return null;
  return (
    <div data-testid="product-specification-sheet" className="grid min-w-0 gap-3.5 md:grid-cols-2 md:items-start">
      {groups.map((group, index) => (
        <section
          key={group.title + "-" + index}
          className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
          aria-labelledby={"product-spec-section-" + index}
        >
          <h3
            id={"product-spec-section-" + index}
            className="border-b border-border/60 bg-surface/60 px-4 py-3.5 text-sm font-semibold text-foreground sm:px-5"
          >
            {language === "ar" ? GROUP_TRANSLATIONS[group.title] ?? group.title : group.title}
          </h3>
          <dl className="divide-y divide-border/50">
            {group.rows.map((row, rowIndex) => (
              <div
                key={row.label + "-" + rowIndex}
                className="grid min-w-0 grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-3 px-4 py-3 text-sm sm:px-5"
              >
                <dt className="min-w-0 break-words text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 break-words font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
