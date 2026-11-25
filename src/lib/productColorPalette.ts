/** Product color presentation only. Stored variant names remain unchanged. */
export const PRODUCT_COLOR_PRESETS = [
  { name: "Black", ar: "أسود", hex: "#111214" },
  { name: "Graphite", ar: "غرافيت", hex: "#3a3a3c" },
  { name: "White", ar: "أبيض", hex: "#f7f7f8" },
  { name: "Silver", ar: "فضي", hex: "#d8dade" },
  { name: "Gold", ar: "ذهبي", hex: "#e2c48d" },
  { name: "Blue", ar: "أزرق", hex: "#2f6fed" },
  { name: "Navy", ar: "كحلي", hex: "#1e3a8a" },
  { name: "Red", ar: "أحمر", hex: "#e0303a" },
  { name: "Green", ar: "أخضر", hex: "#2e9e5b" },
  { name: "Pink", ar: "وردي", hex: "#f0a7c0" },
  { name: "Purple", ar: "بنفسجي", hex: "#a78bfa" },
  { name: "Beige", ar: "بيج", hex: "#e4d8c6" },
  { name: "Gray", ar: "رمادي", hex: "#8e8e93" },
  { name: "Charcoal", ar: "فحمي", hex: "#36393f" },
  { name: "Jet Black", ar: "أسود داكن", hex: "#0d0d0f" },
  { name: "Midnight", ar: "منتصف الليل", hex: "#1c1f2b" },
  { name: "Midnight Blue", ar: "أزرق ليلي", hex: "#191f38" },
  { name: "Sky Blue", ar: "أزرق سماوي", hex: "#7dd3fc" },
  { name: "Ice Blue", ar: "أزرق جليدي", hex: "#c7deee" },
  { name: "Titanium", ar: "تيتانيوم", hex: "#8f8a83" },
  { name: "Natural Titanium", ar: "تيتانيوم طبيعي", hex: "#b5ada0" },
  { name: "Desert Titanium", ar: "تيتانيوم صحراوي", hex: "#d8b08c" },
  { name: "Black Titanium", ar: "تيتانيوم أسود", hex: "#343436" },
  { name: "White Titanium", ar: "تيتانيوم أبيض", hex: "#e7e4df" },
  { name: "Rose Gold", ar: "ذهبي وردي", hex: "#d8a39d" },
  { name: "Starlight", ar: "ضوء النجوم", hex: "#f2ece1" },
  { name: "Cream", ar: "كريمي", hex: "#efe7d8" },
  { name: "Mint", ar: "نعناعي", hex: "#9fe3cf" },
  { name: "Olive", ar: "زيتوني", hex: "#7b8b52" },
  { name: "Teal", ar: "أزرق مخضر", hex: "#0f9b8e" },
  { name: "Lavender", ar: "لافندر", hex: "#c4b5fd" },
  { name: "Burgundy", ar: "عنابي", hex: "#7b2233" },
  { name: "Yellow", ar: "أصفر", hex: "#f5c518" },
  { name: "Orange", ar: "برتقالي", hex: "#f97316" },
  { name: "Brown", ar: "بني", hex: "#8b5e3c" },
  { name: "Copper", ar: "نحاسي", hex: "#b87333" },
  { name: "Coral", ar: "مرجاني", hex: "#ff7f6b" },
  { name: "Clear", ar: "شفاف", hex: "#f4f4f5" },
] as const;

function normalizeColor(value: string) {
  return value.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/\\s+/g, " ");
}

export function findProductColor(value: string) {
  const key = normalizeColor(value);
  if (!key) return undefined;
  return PRODUCT_COLOR_PRESETS.find((color) =>
    normalizeColor(color.name) === key || normalizeColor(color.ar) === key ||
    (key === "grey" && color.name === "Gray"),
  );
}

export function searchProductColors(query: string) {
  const key = normalizeColor(query);
  return PRODUCT_COLOR_PRESETS.filter((color) =>
    normalizeColor(color.name).includes(key) || normalizeColor(color.ar).includes(key) ||
    (key === "grey" && color.name === "Gray"),
  );
}
