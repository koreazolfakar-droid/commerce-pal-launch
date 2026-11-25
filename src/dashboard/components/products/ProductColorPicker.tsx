import { useId, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import { findProductColor, PRODUCT_COLOR_PRESETS, searchProductColors } from "@/lib/productColorPalette";

const COMMON_COUNT = 12;

export default function ProductColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const paletteId = useId();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const selected = findProductColor(value);
  const results = searchProductColors(query);
  const searching = Boolean(query.trim());
  const visible = searching || expanded ? results : results.slice(0, COMMON_COUNT);
  // Keep an existing uncommon selection visible without changing its saved spelling.
  const colors = !searching && selected && !visible.includes(selected)
    ? [...visible, selected]
    : visible;

  return (
    <div className="dashboard-color-picker min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{t("Color")}</span>
        <div className="flex min-w-0 items-center gap-2">
          {value.trim() ? (
            <span
              aria-hidden="true"
              className={`size-6 shrink-0 rounded-full border border-foreground/25 ${selected ? "" : "border-dashed bg-muted"}`}
              style={selected ? { backgroundColor: selected.hex } : undefined}
            />
          ) : null}
          <span className="break-all text-xs font-medium text-foreground" dir="auto">{value.trim() || (ar ? "لم يتم تحديد لون" : "No color selected")}</span>
          {value ? (
            <button type="button" aria-label={ar ? "إزالة اللون" : "Clear color"} onClick={() => onChange("")}
              className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      <label className="relative block">
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          aria-label={ar ? "بحث في الألوان" : "Search colors"}
          placeholder={ar ? "ابحث مثل: تيتانيوم أو Blue" : "Search e.g. Titanium or Blue"}
          className="h-11 w-full rounded-lg border border-border bg-card ps-9 pe-3 text-base text-foreground outline-none focus:border-primary" />
      </label>
      <div id={paletteId} role="group" aria-label={t("Color")} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {colors.map((color) => {
          const active = selected?.name === color.name;
          const label = ar ? color.ar : color.name;
          return (
            <button key={color.name} type="button" aria-label={`${t("Color")}: ${label}`}
              aria-pressed={active} onClick={() => onChange(color.name)}
              className={`dashboard-color-option flex min-h-12 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-start text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-muted/40"}`}>
              <span aria-hidden="true" className="size-6 shrink-0 rounded-full border border-foreground/25 ring-1 ring-foreground/5"
                style={{ backgroundColor: color.hex }} />
              <span className="min-w-0 flex-1 break-words leading-tight">{label}</span>
              {active ? <Check aria-hidden="true" className="size-3.5 shrink-0 text-primary" /> : null}
            </button>
          );
        })}
      </div>
      {searching && colors.length === 0 ? (
        <p role="status" className="text-xs text-muted-foreground">{ar ? "لا توجد نتائج. أدخل اسم اللون الرسمي أدناه." : "No matching colors. Enter the official name below."}</p>
      ) : null}
      {!searching ? (
        <button type="button" aria-controls={paletteId} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
          {expanded ? (ar ? "عرض الألوان الشائعة" : "Show common colors") : (ar ? `عرض كل الألوان (${PRODUCT_COLOR_PRESETS.length})` : `Show all colors (${PRODUCT_COLOR_PRESETS.length})`)}
          <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      ) : null}
      <label className="block text-sm font-semibold text-foreground">
        {ar ? "اسم اللون الرسمي" : "Custom color name"}
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={ar ? "مثال: Midnight Blue" : "e.g. Midnight Blue"}
          maxLength={80} dir="auto"
          className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary" />
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {ar ? "اختر لوناً أو اكتب الاسم الرسمي كما يظهر على المنتج. الدرجات المعروضة تقريبية." : "Choose a color or enter the official product name. Swatches are approximate."}
      </p>
    </div>
  );
}
