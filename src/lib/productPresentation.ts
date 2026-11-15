import type { SpecGroup } from "@/lib/productContent";
import type { StoreProduct } from "@/lib/storeTypes";

/** One catalogue item must appear at most once across all suggestion sections. */
export function buildProductSuggestions({
  current,
  recommendations = [],
  vendorProducts = [],
  limit = 8,
}: {
  current: StoreProduct;
  recommendations?: StoreProduct[];
  vendorProducts?: StoreProduct[];
  limit?: number;
}) {
  const normalize = (value?: string | null) => (value ?? "").normalize("NFKC").trim().toLowerCase();
  const seenHandles = new Set([normalize(current.node.handle)]);
  const seenIds = new Set([normalize(current.node.id)]);
  const vendor = normalize(current.node.vendor);
  const similar: StoreProduct[] = [];
  const sameVendor: StoreProduct[] = [];
  const max = Math.max(0, Math.min(12, Math.trunc(limit)));

  const add = (candidate: StoreProduct, target: StoreProduct[]) => {
    const handle = normalize(candidate?.node?.handle);
    const id = normalize(candidate?.node?.id);
    if (!handle || !id || seenHandles.has(handle) || seenIds.has(id)) return false;
    seenHandles.add(handle);
    seenIds.add(id);
    target.push(candidate);
    return true;
  };

  // Reserve real brand matches for the branded rail before composing recommendations.
  // This prevents the recommended algorithm (which often boosts same-brand items)
  // from consuming the one brand card that the separate section should display.
  if (vendor) {
    for (const candidate of vendorProducts) {
      if (sameVendor.length >= max) break;
      if (normalize(candidate?.node?.vendor) === vendor) add(candidate, sameVendor);
    }
  }
  for (const candidate of recommendations) {
    if (similar.length >= max) break;
    add(candidate, similar);
  }
  return { similar, sameVendor };
}

export interface ProductHighlight {
  key: string;
  label: string;
  labelAr: string;
  value: string;
}

const HIGHLIGHT_RULES = [
  { key: "power", match: /power|watt|charging speed/i, label: "Power", labelAr: "القدرة" },
  {
    key: "technology",
    match: /\bgan\b|technology|charging protocol|التقنية/i,
    label: "Technology",
    labelAr: "التقنية",
  },
  { key: "processor", match: /processor|chipset|المعالج/i, label: "Processor", labelAr: "المعالج" },
  {
    key: "port",
    match: /\bports?\b|connector|usb|interface|\bconnection\b|الاتصال|التوصيل|المنفذ/i,
    label: "Connection",
    labelAr: "الاتصال",
  },
  { key: "display", match: /display|screen|panel|الشاشة/i, label: "Display", labelAr: "الشاشة" },
  { key: "cable", match: /cable|box contents|included/i, label: "Included", labelAr: "المرفقات" },
  { key: "battery", match: /battery|\bmah\b|البطارية/i, label: "Battery", labelAr: "البطارية" },
  { key: "storage", match: /storage|capacity|التخزين/i, label: "Storage", labelAr: "التخزين" },
  { key: "ram", match: /\bram\b|memory|الذاكرة/i, label: "Memory", labelAr: "الذاكرة" },
  { key: "camera", match: /camera|الكاميرا/i, label: "Camera", labelAr: "الكاميرا" },
  { key: "bluetooth", match: /bluetooth|بلوتوث/i, label: "Bluetooth", labelAr: "بلوتوث" },
] as const;

/** Highlights are extracted exclusively from merchant specifications or the product title. */
export function buildProductHighlights(
  groups: SpecGroup[],
  title: string,
  limit = 5,
): ProductHighlight[] {
  const values = new Map<string, ProductHighlight>();
  const max = Math.max(0, Math.min(6, Math.trunc(limit)));

  for (const group of groups) {
    for (const row of group.rows) {
      const rule = HIGHLIGHT_RULES.find((entry) => entry.match.test(row.label));
      const value = row.value?.trim();
      if (!rule || !value || /^(?:n\/a|unknown|not specified|غير محدد|غير متوفر)$/i.test(value))
        continue;
      if (!values.has(rule.key)) {
        values.set(rule.key, { key: rule.key, label: rule.label, labelAr: rule.labelAr, value });
      }
    }
  }

  const addFromTitle = (
    key: string,
    match: RegExp,
    value: string | ((result: RegExpMatchArray) => string),
  ) => {
    if (values.has(key)) return;
    const found = title.match(match);
    if (!found) return;
    const rule = HIGHLIGHT_RULES.find((entry) => entry.key === key);
    if (!rule) return;
    values.set(key, {
      key,
      label: rule.label,
      labelAr: rule.labelAr,
      value: typeof value === "string" ? value : value(found),
    });
  };

  addFromTitle("power", /\b(\d{1,3}(?:\.\d+)?)\s?W\b/i, (match) => `${match[1]}W`);
  addFromTitle("technology", /\bGaN\b/i, "GaN");
  addFromTitle("port", /\bUSB[ -]?C\b/i, "USB-C");
  addFromTitle("display", /\bLED\s+display\b/i, "LED display");
  addFromTitle(
    "cable",
    /(?:\bwith\s+(?:(?:a|an)\s+)?(?:USB[ -]?C\s+)?|&\s*(?:USB[ -]?C\s+)?)cable\b/i,
    "Cable",
  );
  return [...values.values()].slice(0, max);
}

/** A concise view of explicit merchant values; complete wording remains in the spec table. */
export function formatProductHighlight(key: string, value: string): string {
  if (key === "display") {
    const size = value.match(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s?(?:[- ]?inch(?:es)?\b|["″])/i);
    const resolution = value.match(/\b(?:WQHD|QHD|FHD|HD)\+?|\b[248]K\b/i);
    const panel = value.match(
      /\b(?:LTPO\s+)?(?:AMOLED|OLED|IPS(?:\s+LCD)?|LCD|Mini[- ]LED|LED)\b/i,
    );
    const refresh = value.match(/(?<![\d.,])(\d{2,3})\s?Hz\b/i);
    const parts = [
      size ? size[1] + "″" : "",
      [resolution?.[0], panel?.[0]].filter(Boolean).join(" "),
      refresh ? refresh[1] + " Hz" : "",
    ].filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }
  if (key === "camera") {
    const camera = value.match(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s?MP\b/i);
    if (camera) return camera[1] + " MP";
  }
  if (key === "battery") {
    const battery = value.match(/(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d+)\s?mAh\b/i);
    if (battery) return battery[1] + " mAh";
  }
  return value;
}
