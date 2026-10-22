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
  { key: "technology", match: /\bgan\b|technology|charging protocol/i, label: "Technology", labelAr: "التقنية" },
  { key: "port", match: /port|connector|usb|interface/i, label: "Connection", labelAr: "الاتصال" },
  { key: "display", match: /display|screen|panel/i, label: "Display", labelAr: "الشاشة" },
  { key: "cable", match: /cable|box contents|included/i, label: "Included", labelAr: "المرفقات" },
  { key: "storage", match: /storage|capacity/i, label: "Storage", labelAr: "التخزين" },
  { key: "ram", match: /\bram\b|memory/i, label: "Memory", labelAr: "الذاكرة" },
  { key: "battery", match: /battery|\bmah\b/i, label: "Battery", labelAr: "البطارية" },
  { key: "camera", match: /camera/i, label: "Camera", labelAr: "الكاميرا" },
  { key: "bluetooth", match: /bluetooth/i, label: "Bluetooth", labelAr: "بلوتوث" },
] as const;

/** Highlights are extracted exclusively from merchant specifications or the product title. */
export function buildProductHighlights(groups: SpecGroup[], title: string, limit = 5): ProductHighlight[] {
  const values = new Map<string, ProductHighlight>();
  const max = Math.max(0, Math.min(6, Math.trunc(limit)));

  for (const group of groups) {
    for (const row of group.rows) {
      const rule = HIGHLIGHT_RULES.find((entry) => entry.match.test(row.label));
      const value = row.value?.trim();
      if (!rule || !value || value.length > 64 || /^(?:n\/a|unknown|not specified)$/i.test(value)) continue;
      if (!values.has(rule.key)) {
        values.set(rule.key, { key: rule.key, label: row.label, labelAr: rule.labelAr, value });
      }
    }
  }

  const addFromTitle = (key: string, match: RegExp, value: string | ((result: RegExpMatchArray) => string)) => {
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
  addFromTitle("cable", /\bwith\s+(?:(?:a|an)\s+)?(?:USB[ -]?C\s+)?cable\b/i, "Cable");
  return [...values.values()].slice(0, max);
}
