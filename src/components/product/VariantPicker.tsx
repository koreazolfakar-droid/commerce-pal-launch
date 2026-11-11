import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { productOptionLabel, productOptionValue } from "@/lib/productOptionDisplay";

export interface VariantLike {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

/** CSS colours for common product colour option words (presentation only). */
const COLOR_WORDS: Record<string, string> = {
  black: "#111214",
  graphite: "#3a3a3c",
  grey: "#8e8e93",
  gray: "#8e8e93",
  space: "#4a4a4f",
  titanium: "#8f8a83",
  silver: "#d8dade",
  white: "#f7f7f8",
  cream: "#efe7d8",
  beige: "#e4d8c6",
  gold: "#e2c48d",
  rose: "#e8b4b8",
  pink: "#f0a7c0",
  purple: "#a78bfa",
  violet: "#8b5cf6",
  lavender: "#c4b5fd",
  blue: "#2f6fed",
  navy: "#1e3a8a",
  teal: "#0f9b8e",
  mint: "#9fe3cf",
  green: "#2e9e5b",
  lime: "#a3e635",
  yellow: "#f5c518",
  orange: "#f97316",
  red: "#e0303a",
  burgundy: "#7b2233",
  brown: "#8b5e3c",
  bronze: "#a97142",
  copper: "#b87333",
  sand: "#dfd3b8",
  ivory: "#f4efe4",
  charcoal: "#36393f",
  midnight: "#1c1f2b",
  starlight: "#f2ece1",
  natural: "#d8cfc2",
  desert: "#d8b08c",
  ocean: "#1f6f8b",
  sky: "#7dd3fc",
  coral: "#ff7f6b",
  jade: "#00a86b",
  obsidian: "#151517",
  sage: "#b2c2a4",
  olive: "#7b8b52",
  mist: "#c7d6e0",
  jetblack: "#0d0d0f",
  jet: "#0d0d0f",
  apricot: "#f2c39b",
  oat: "#e6dcc8",
  pearl: "#f1eeea",
  velvet: "#141416",
  clear: "#f4f4f5",
  aurora: "#eef2f6",
  phantom: "#17181c",
  sprout: "#a8d5a2",
  malachite: "#0f7b5a",
  fir: "#274d38",
  cypress: "#2f4f42",
  nebula: "#8d8b86",
  luminous: "#ff7a1a",
  misty: "#b9a7c7",
  ethereal: "#8ab6dd",
  moonshadow: "#2a2b30",
  geek: "#1b1c20",
  awesome: "#4b4f56",
  light: "#cfe3f2",
  cobalt: "#5b4bd0",
  shadow: "#3a3550",
  glacier: "#d8e5ee",
};

const ARABIC_COLORS: Record<string, string> = {
  أسود: "#111214",
  اسود: "#111214",
  أبيض: "#f7f7f8",
  ابيض: "#f7f7f8",
  فضي: "#d8dade",
  ذهبي: "#e2c48d",
  أزرق: "#2f6fed",
  ازرق: "#2f6fed",
  أحمر: "#e0303a",
  احمر: "#e0303a",
  أخضر: "#2e9e5b",
  اخضر: "#2e9e5b",
  وردي: "#f0a7c0",
  بنفسجي: "#a78bfa",
  رمادي: "#8e8e93",
  بيج: "#e4d8c6",
};

function swatchColor(value: string) {
  const arabic = Object.entries(ARABIC_COLORS).find(([name]) => value.includes(name));
  if (arabic) return arabic[1];
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  if (COLOR_WORDS[normalized]) return COLOR_WORDS[normalized];
  const words = value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  for (const word of [...words].reverse()) {
    if (COLOR_WORDS[word]) return COLOR_WORDS[word];
  }
  return null;
}

function isColorOption(name: string) {
  return /colou?r|shade|finish|اللون|الألوان|لون/i.test(name);
}

/**
 * Option-level selectors built from real product options + variants.
 * A value is disabled when no available variant matches it alongside the rest
 * of the current selection.
 */
export function VariantPicker({
  options,
  variants,
  selected,
  onSelect,
  compactSingleValues = false,
}: {
  options: Array<{ name: string; values: string[] }>;
  variants: VariantLike[];
  selected: Record<string, string>;
  onSelect: (name: string, value: string) => void;
  compactSingleValues?: boolean;
}) {
  const { language } = useLanguage();
  const real = options.filter(
    (option) =>
      option.values.length > 0 &&
      !(option.values.length <= 1 && /^title$/i.test(option.name)) &&
      option.values.some((value) => !/^default(\s+title)?$/i.test(value)),
  );
  if (real.length === 0) return null;

  // A change to one option can switch to another compatible in-stock variant.
  // Don't falsely disable an available color just because the current storage
  // size isn't sold in that color; ProductPage resolves the other options.
  const isAvailable = (name: string, value: string) =>
    variants.some(
      (variant) =>
        variant.availableForSale &&
        variant.selectedOptions.some((option) => option.name === name && option.value === value),
    );

  return (
    <div className="grid gap-3 sm:gap-4">
      {real.map((option) => {
        const color = isColorOption(option.name);
        const label = productOptionLabel(option.name, language);
        const single = compactSingleValues && option.values.length === 1;
        if (single)
          return (
            <div
              key={option.name}
              data-testid="product-fixed-option"
              className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 text-sm"
            >
              <span className="text-muted-foreground">{label}</span>
              {color && swatchColor(option.values[0]) && (
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: swatchColor(option.values[0])! }}
                />
              )}
              <span className="font-medium text-foreground">
                <bdi>{productOptionValue(option.name, option.values[0])}</bdi>
              </span>
            </div>
          );
        return (
          <fieldset key={option.name} className="min-w-0">
            <legend className="mb-2 flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selected[option.name] === value;
                const available = isAvailable(option.name, value);
                if (color) {
                  const hex = swatchColor(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      title={value}
                      aria-label={`${label}: ${productOptionValue(option.name, value)}`}
                      aria-pressed={active}
                      disabled={!available}
                      onClick={() => onSelect(option.name, value)}
                      className={cn(
                        "press relative inline-flex min-h-12 min-w-0 max-w-full flex-1 basis-24 items-center justify-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        active
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-border hover:border-primary/50",
                        !available && "opacity-40",
                      )}
                    >
                      {hex ? (
                        <span
                          aria-hidden
                          className="h-5.5 w-5.5 shrink-0 rounded-full border border-border/60 sm:h-6 sm:w-6"
                          style={{ backgroundColor: hex }}
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="h-5.5 w-5.5 shrink-0 rounded-full border border-dashed border-muted-foreground/50 bg-gradient-to-br from-surface to-background sm:h-6 sm:w-6"
                        />
                      )}
                      <bdi className="min-w-0 break-words">{value}</bdi>
                      {active && <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                }
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${label}: ${productOptionValue(option.name, value)}`}
                    aria-pressed={active}
                    disabled={!available}
                    onClick={() => onSelect(option.name, value)}
                    className={cn(
                      "press min-h-12 min-w-16 flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/60",
                      !available && "opacity-40 line-through",
                    )}
                  >
                    <bdi>{productOptionValue(option.name, value)}</bdi>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
