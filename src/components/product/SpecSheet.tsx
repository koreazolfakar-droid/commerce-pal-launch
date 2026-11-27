import type { SpecGroup } from "@/lib/productContent";
import { useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { filterSpecificationGroups } from "@/lib/productDetailDisplay";

const GROUP_TRANSLATIONS: Record<string, string> = {
  Specifications: "المواصفات",
  Display: "الشاشة",
  Performance: "الأداء",
  "Memory & Storage": "الذاكرة والتخزين",
  Camera: "الكاميرا",
  "Battery & Charging": "البطارية والشحن",
  Connectivity: "الاتصالات",
  Audio: "الصوت",
  "Design & Build": "التصميم",
  "Software & Features": "النظام والميزات",
  "Power & Compatibility": "الطاقة والتوافق",
  "More details": "تفاصيل أخرى",
  "Selected configuration": "النسخة المختارة",
};

const LABEL_TRANSLATIONS: Record<string, string> = {
  brand: "العلامة التجارية",
  "product type": "نوع المنتج",
  storage: "التخزين",
  "internal storage": "التخزين الداخلي",
  memory: "الذاكرة",
  ram: "ذاكرة RAM",
  color: "اللون",
  colour: "اللون",
  processor: "المعالج",
  chipset: "المعالج",
  display: "الشاشة",
  screen: "الشاشة",
  battery: "البطارية",
  "battery capacity": "سعة البطارية",
  camera: "الكاميرا",
  "main camera": "الكاميرا الرئيسية",
  weight: "الوزن",
  sku: "رمز المنتج",
  barcode: "الباركود",
};

export function SpecSheet({
  groups,
  language = "en",
}: {
  groups: SpecGroup[];
  language?: "ar" | "en";
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const ar = language === "ar";
  const localized = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        title: ar ? (GROUP_TRANSLATIONS[group.title] ?? group.title) : group.title,
        rows: group.rows.map((row) => ({
          ...row,
          label: ar ? (LABEL_TRANSLATIONS[row.label.trim().toLowerCase()] ?? row.label) : row.label,
        })),
      })),
    [groups, ar],
  );
  const filtered = useMemo(() => filterSpecificationGroups(localized, query), [localized, query]);
  const total = localized.reduce((sum, group) => sum + group.rows.length, 0);
  const count = filtered.reduce((sum, group) => sum + group.rows.length, 0);
  const clearSearch = () => {
    setQuery("");
    searchRef.current?.focus();
  };
  if (groups.length === 0) return null;
  return (
    <div data-testid="product-specification-sheet" className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="relative w-full min-w-0 sm:max-w-sm">
          <label htmlFor={id + "-search"} className="sr-only">
            {ar ? "ابحث في المواصفات" : "Search specifications"}
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute start-3 top-3.5 h-4 w-4 text-muted-foreground"
          />
          <input
            id={id + "-search"}
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "ابحث عن ميزة أو قيمة…" : "Search a feature or value…"}
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-background pe-11 ps-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={ar ? "مسح البحث في المواصفات" : "Clear specifications search"}
              className="absolute end-0 top-0 grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-muted-foreground"
        >
          {ar ? `${count} من ${total} مواصفة` : `${count} of ${total} specifications`}
        </p>
      </div>
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {ar ? "لا توجد مواصفات مطابقة لبحثك." : "No specifications match your search."}
          </p>
          <button
            type="button"
            onClick={clearSearch}
            className="mt-2 min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ar ? "عرض جميع المواصفات" : "Show all specifications"}
          </button>
        </div>
      )}
      <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-start">
        {filtered.map((group, index) => (
          <section
            key={group.title + "-" + index}
            className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card"
            aria-labelledby={id + "-section-" + index}
          >
            <h3
              id={id + "-section-" + index}
              className="border-b border-border/60 bg-surface/60 px-4 py-3 text-sm font-semibold text-foreground"
            >
              {group.title}
            </h3>
            <dl className="divide-y divide-border/50">
              {group.rows.map((row, rowIndex) => (
                <div
                  key={row.label + "-" + rowIndex}
                  className="grid min-w-0 grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-3 px-4 py-2.5 text-start text-sm leading-relaxed odd:bg-surface/30"
                >
                  <dt className="min-w-0 break-words text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 break-words font-medium text-foreground">
                    <bdi>{row.value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
