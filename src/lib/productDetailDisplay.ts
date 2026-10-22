import type { ContentSection, SpecGroup } from "@/lib/productContent";

export type ProductTitleFact = {
  key: "power" | "technology" | "connection" | "display" | "included" | "color";
  value: string;
  label: string;
  labelAr: string;
};

const COLOR_SUFFIX = /(?:\s[-–—]\s|\()\s*(black|white|blue|red|green|grey|gray|silver|gold|pink|purple|navy)\s*\)?\s*$/i;

const FACT_DEFINITIONS: Array<{
  key: ProductTitleFact["key"];
  label: string;
  labelAr: string;
  pattern: RegExp;
  value: (match: RegExpMatchArray) => string;
}> = [
  { key: "power", label: "Power", labelAr: "القدرة", pattern: /\b(\d{1,3}(?:\.\d+)?)\s?W\b/i, value: (match) => match[1] + "W" },
  { key: "technology", label: "Technology", labelAr: "التقنية", pattern: /\bGaN\b/i, value: () => "GaN" },
  { key: "connection", label: "Connection", labelAr: "التوصيل", pattern: /\bUSB[\s-]?C\b/i, value: () => "USB-C" },
  { key: "display", label: "Display", labelAr: "الشاشة", pattern: /\bLED\s+display\b/i, value: () => "LED display" },
  { key: "included", label: "Included", labelAr: "الملحقات", pattern: /(?:\bwith\s+(?:(?:a|an)\s+)?(?:USB[\s-]?C\s+)?|&\s*(?:USB[\s-]?C\s+)?)cable\b/i, value: () => "Cable" },
  { key: "color", label: "Color", labelAr: "اللون", pattern: COLOR_SUFFIX, value: (match) => match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() },
];

/** Only explicit facts from the merchant's product title; never estimate absent specifications. */
export function inferProductTitleFacts(title: string): ProductTitleFact[] {
  return FACT_DEFINITIONS.flatMap((definition) => {
    const match = title.match(definition.pattern);
    return match
      ? [{ key: definition.key, label: definition.label, labelAr: definition.labelAr, value: definition.value(match) }]
      : [];
  });
}

const LABEL_SYNONYMS: Record<ProductTitleFact["key"], RegExp> = {
  power: /power|output|charging speed|watt|القدرة|الشحن/i,
  technology: /technology|gan|protocol|التقنية/i,
  connection: /port|connector|connection|usb|منفذ|التوصيل/i,
  display: /display|screen|شاشة|العرض/i,
  included: /included|cable|box content|مرفق|كابل|محتويات/i,
  color: /colou?r|اللون/i,
};

/** Supplement real catalogue specifications with title facts, without duplicating existing fields. */
export function buildDisplaySpecificationGroups(
  groups: SpecGroup[],
  title: string,
  language: "ar" | "en",
): SpecGroup[] {
  const facts = inferProductTitleFacts(title);
  const existing = groups.flatMap((group) => group.rows);
  const newFacts = facts.filter((fact) => !existing.some((row) => {
    const label = row.label.normalize("NFKC").trim();
    const value = row.value.normalize("NFKC").trim().toLowerCase();
    // Existing merchant data has priority, including when the value differs from the title.
    return LABEL_SYNONYMS[fact.key].test(label) || value === fact.value.toLowerCase();
  }));
  if (!newFacts.length) return groups;
  const inferredGroup = {
    title: language === "ar" ? "معلومات مؤكدة من اسم المنتج" : "Product highlights",
    rows: newFacts.map((fact) => ({
      label: language === "ar" ? fact.labelAr : fact.label,
      value: fact.value,
    })),
  };
  return [inferredGroup, ...groups];
}

const TYPES: Array<{ pattern: RegExp; en: string; ar: string }> = [
  { pattern: /\bcharg(?:er|ing adapter)\b/i, en: "charger", ar: "شاحن" },
  { pattern: /\b(?:earbuds|earphones)\b/i, en: "earbuds", ar: "سماعات أذن" },
  { pattern: /\b(?:headphones|headset)\b/i, en: "headphones", ar: "سماعات" },
  { pattern: /\b(?:screen protector|tempered glass)\b/i, en: "screen protector", ar: "حماية شاشة" },
  { pattern: /\b(?:phone case|protective case|cover)\b/i, en: "phone case", ar: "غطاء هاتف" },
  { pattern: /\b(?:smartwatch|smart watch)\b/i, en: "smartwatch", ar: "ساعة ذكية" },
  { pattern: /\b(?:smartphone|iphone|phone)\b/i, en: "phone", ar: "هاتف" },
  { pattern: /\b(?:tablet|ipad)\b/i, en: "tablet", ar: "جهاز لوحي" },
  { pattern: /\blaptop\b/i, en: "laptop", ar: "حاسوب محمول" },
];

function overviewFromKnownFacts(title: string, brand: string | undefined, language: "ar" | "en") {
  const facts = inferProductTitleFacts(title);
  const kind = TYPES.find((entry) => entry.pattern.test(title));
  if (!kind && !facts.length) return "";

  const rawBrand = (brand ?? "").trim();
  const label = kind
    ? language === "ar"
      ? kind.ar + (rawBrand ? " من " + rawBrand : "")
      : (rawBrand ? rawBrand + " " : "") + kind.en
    : title.trim();

  const descriptions: Record<ProductTitleFact["key"], { en: (s: string) => string; ar: (s: string) => string }> = {
    power: { en: (v) => v + " power", ar: (v) => "قدرة " + v },
    technology: { en: (v) => v + " technology", ar: (v) => "تقنية " + v },
    connection: { en: (v) => v + " connection", ar: (v) => "توصيل " + v },
    display: { en: (v) => v, ar: (v) => "شاشة " + v },
    included: { en: () => "included cable", ar: () => "كابل مرفق" },
    color: { en: (v) => v + " color", ar: (v) => "لون " + v },
  };
  const details = facts.map((fact) => descriptions[fact.key][language](fact.value));
  if (!details.length) return label + ".";
  return language === "ar"
    ? label + " بمواصفات مذكورة في اسم المنتج: " + details.join("، ") + "."
    : label + " with " + details.join(", ") + ".";
}

/** Keep the merchant's useful description; improve minimal one-word/one-number entries. */
export function buildDisplayOverview(
  sections: ContentSection[],
  title: string,
  brand: string | undefined,
  language: "ar" | "en",
): ContentSection[] {
  const meaningful = sections
    .map((section) => ({
      ...section,
      paragraphs: section.paragraphs.filter((paragraph) => paragraph.trim().length >= 32),
    }))
    .filter((section) => section.paragraphs.length > 0 || section.bullets.length > 0);
  if (meaningful.length) return meaningful;

  const overview = overviewFromKnownFacts(title, brand, language);
  if (!overview) return [];
  return [{ title: null, paragraphs: [overview], bullets: [], specs: [] }];
}

export function inferredBoxContents(title: string, language: "ar" | "en"): ContentSection[] {
  const cable = inferProductTitleFacts(title).find((fact) => fact.key === "included");
  if (!cable) return [];
  return [{
    title: null,
    paragraphs: [],
    bullets: [language === "ar" ? "كابل (مذكور ضمن اسم المنتج)" : "Cable (listed in the product title)"],
    specs: [],
  }];
}
