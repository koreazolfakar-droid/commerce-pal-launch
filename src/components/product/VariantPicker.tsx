import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface VariantLike {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

/** CSS colours for common Shopify colour option words (presentation only). */
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
};


function swatchColor(value: string) {
  const words = value.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const word of [...words].reverse()) {
    if (COLOR_WORDS[word]) return COLOR_WORDS[word];
  }
  return null;
}

function isColorOption(name: string) {
  return /colou?r|shade|finish/i.test(name);
}

/**
 * Option-level selectors built from real Shopify options + variants.
 * A value is disabled when no available variant matches it alongside the rest
 * of the current selection.
 */
export function VariantPicker({
  options,
  variants,
  selected,
  onSelect,
}: {
  options: Array<{ name: string; values: string[] }>;
  variants: VariantLike[];
  selected: Record<string, string>;
  onSelect: (name: string, value: string) => void;
}) {
  // Shopify's implicit single option ("Title": Default / Default Title) is not
  // a real customer choice, so it never renders as a selector.
  const real = options.filter(
    (option) =>
      option.values.length > 0 &&
      !(option.values.length <= 1 && /^title$/i.test(option.name)) &&
      option.values.some((value) => !/^default(\s+title)?$/i.test(value)),
  );
  if (real.length === 0) return null;

  const isAvailable = (name: string, value: string) =>
    variants.some(
      (variant) =>
        variant.availableForSale &&
        variant.selectedOptions.every((option) =>
          option.name === name ? option.value === value : (selected[option.name] ?? option.value) === option.value,
        ),
    );

  return (
    <div className="grid gap-5">
      {real.map((option) => {
        const color = isColorOption(option.name);
        return (
          <div key={option.name}>
            <div className="mb-2.5 flex items-baseline gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {option.name}
              </h2>
              {selected[option.name] && (
                <span className="text-[13px] font-semibold text-foreground">{selected[option.name]}</span>
              )}
            </div>
            <div className={cn("flex flex-wrap", color ? "gap-2.5" : "gap-2")}>
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
                      aria-label={`${option.name}: ${value}`}
                      aria-pressed={active}
                      disabled={!available}
                      onClick={() => onSelect(option.name, value)}
                      className={cn(
                        "press relative grid h-11 w-11 place-items-center rounded-full border-2 transition-colors",
                        active ? "border-primary" : "border-border hover:border-primary/50",
                        !available && "opacity-40",
                      )}
                    >
                      {hex ? (
                        <span
                          aria-hidden
                          className="h-7 w-7 rounded-full border border-border/60"
                          style={{ backgroundColor: hex }}
                        />
                      ) : (
                        <span className="px-1 text-[10px] font-bold uppercase">{value.slice(0, 3)}</span>
                      )}
                      {active && (
                        <Check
                          aria-hidden
                          className="absolute h-3.5 w-3.5 text-primary-foreground mix-blend-difference"
                        />
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    disabled={!available}
                    onClick={() => onSelect(option.name, value)}
                    className={cn(
                      "press min-w-16 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-accent text-primary"
                        : "border-border bg-card hover:border-primary/60",
                      !available && "opacity-40 line-through",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
