/** Presentation only: never change the option names/values used to select a variant. */
export function productOptionKind(name: string) {
  if (/colou?r|shade|finish|اللون|الألوان|لون/i.test(name)) return "color";
  if (/storage|التخزين|سعة التخزين/i.test(name)) return "storage";
  if (/^(?:ram|memory|الذاكرة)$/i.test(name.trim())) return "memory";
  return "other";
}

export function productOptionLabel(name: string, language: "ar" | "en") {
  const labels = {
    color: { en: "Color", ar: "اللون" },
    storage: { en: "Storage", ar: "التخزين" },
    memory: { en: "Memory", ar: "الذاكرة" },
  };
  const kind = productOptionKind(name);
  return kind === "other" ? name : labels[kind][language];
}

export function productOptionValue(name: string, value: string) {
  const kind = productOptionKind(name);
  return (kind === "storage" || kind === "memory") && /^\d+$/.test(value.trim())
    ? `${value.trim()}GB`
    : value;
}
