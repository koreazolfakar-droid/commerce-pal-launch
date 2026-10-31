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
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <span className="text-[13px] font-bold text-slate-700">{t("Color")}</span>
        <span className="text-xs text-slate-500">{value.trim() || t("No color selected")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {COMMON_COLORS.map((color) => {
          const active = selected === color.name.toLowerCase();
          return (
            <button
              key={color.name}
              type="button"
              aria-label={`${t("Color")}: ${t(color.name)}`}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : color.name)}
              className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2 text-start text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${active ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"}`}
            >
              <span
                aria-hidden="true"
                className="relative size-5 shrink-0 rounded-full border border-slate-300"
                style={{ backgroundColor: color.hex }}
              >
                {active ? (
                  <Check className="absolute inset-0 m-auto size-3.5 text-white mix-blend-difference" />
                ) : null}
              </span>
              <span className="min-w-0 truncate">{t(color.name)}</span>
            </button>
          );
        })}
      </div>
      <label className="mt-3 block text-xs font-semibold text-slate-600">
        {t("Custom color name")}
        <input
          type="text"
          value={isPreset ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("e.g. Midnight Blue")}
          maxLength={80}
          className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-indigo-400"
        />
      </label>
      <p className="mt-1 text-xs text-slate-500">
        {t("Choose a common color or enter the exact name printed on the product.")}
      </p>
    </div>
  );
}
