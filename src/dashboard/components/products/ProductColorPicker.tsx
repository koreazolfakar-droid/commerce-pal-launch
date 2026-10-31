import { Check } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";

// Store canonical colour names so the storefront variant swatches remain consistent.
const COMMON_COLORS = [
  { name: "Black", hex: "#111214" },
  { name: "Graphite", hex: "#3a3a3c" },
  { name: "White", hex: "#f7f7f8" },
  { name: "Silver", hex: "#d8dade" },
  { name: "Gold", hex: "#e2c48d" },
  { name: "Blue", hex: "#2f6fed" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Red", hex: "#e0303a" },
  { name: "Green", hex: "#2e9e5b" },
  { name: "Pink", hex: "#f0a7c0" },
  { name: "Purple", hex: "#a78bfa" },
  { name: "Beige", hex: "#e4d8c6" },
] as const;

export default function ProductColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const selected = value.trim().toLowerCase();
  const isPreset = COMMON_COLORS.some((color) => color.name.toLowerCase() === selected);

  return (
    <div className="dashboard-color-picker min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{t("Color")}</span>
        <span className="text-xs text-muted-foreground">{value.trim() || t("No color selected")}</span>
      </div>
      <div role="group" aria-label={t("Color")} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {COMMON_COLORS.map((color) => {
          const active = selected === color.name.toLowerCase();
          return (
            <button
              key={color.name}
              type="button"
              aria-label={`${t("Color")}: ${t(color.name)}`}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : color.name)}
              className={`dashboard-color-option flex min-h-12 min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-start text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-muted/40"}`}
            >
              <span
                aria-hidden="true"
                className="relative size-6 shrink-0 rounded-full border border-foreground/20 ring-1 ring-foreground/5"
                style={{ backgroundColor: color.hex }}
              >
                {active ? (
                  <Check className="absolute inset-0 m-auto size-3.5 text-white mix-blend-difference" />
                ) : null}
              </span>
              <span className="min-w-0 break-words leading-tight">{t(color.name)}</span>
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-sm font-semibold text-foreground">
        {t("Custom color name")}
        <input
          type="text"
          value={isPreset ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("e.g. Midnight Blue")}
          maxLength={80}
          className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary"
        />
      </label>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t("Choose a common color or enter the exact name printed on the product.")}
      </p>
    </div>
  );
}
