import type {
  ProductSpecificationField,
  ProductSpecificationTemplate,
  ProductSpecificationValues,
} from "@/lib/productSpecifications";

/**
 * Deterministic, category-scoped import. Never searches for product facts,
 * changes the category or persists data; the merchant reviews each value.
 */
export type SpecificationImportMatch = {
  key: string;
  label: string;
  labelAr?: string;
  value: string;
  line: number;
};

export type SpecificationImportSkipped = {
  line: number;
  label: string;
  reason: "unmatched" | "ambiguous" | "duplicate" | "empty" | "too_long";
};

export type SpecificationImportResult = {
  matches: SpecificationImportMatch[];
  skipped: SpecificationImportSkipped[];
  truncated: boolean;
};

const MAX_IMPORT_CHARS = 24_000;
const MAX_IMPORT_LINES = 160;
const MAX_SPEC_VALUE_CHARS = 500;

function normalizedLabel(raw: string) {
  return raw
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[\u200e\u200f]/g, "")
    .replace(/\s*\([^)]{1,24}\)\s*$/u, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

// Common manufacturer terms are aliases only when the current category has
// the corresponding field. Canonical keys/labels always take precedence.
const FIELD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  display_size: ["screen size", "screen diagonal", "display diagonal", "screen size (in)", "حجم شاشة"],
  display_type: ["panel type", "screen technology", "panel technology", "نوع الشاشة"],
  display_resolution: ["screen resolution", "screen pixels", "resolution", "دقة الشاشة"],
  refresh_rate: ["screen refresh rate", "display refresh rate", "معدل تحديث الشاشة"],
  chipset: ["processor", "soc", "cpu", "mobile processor", "شريحة المعالجة"],
  processor: ["cpu", "chipset", "processor model"],
  ram: ["ram size", "ram capacity", "system memory", "memory (ram)", "الرام"],
  storage: ["internal storage", "internal memory", "storage capacity", "rom", "مساحة التخزين"],
  operating_system: ["os", "system software", "نظام التشغيل"],
  rear_camera: ["main camera", "primary camera", "rear camera", "الكاميرا الرئيسية"],
  front_camera: ["selfie camera", "front camera", "كاميرا السيلفي"],
  battery_capacity: ["battery", "battery size", "battery capacity (mah)", "سعة بطارية"],
  charging_power: ["wired charging power", "fast charging wattage", "wired charging", "قدرة الشحن"],
  bluetooth_version: ["bluetooth", "bt version", "bluetooth ver", "اصدار بلوتوث"],
  noise_cancellation: ["anc", "active noise cancellation", "noise canceling", "عزل الضوضاء"],
  water_resistance: ["ip rating", "waterproof rating", "dust water protection", "تصنيف الحماية"],
  driver_size: ["driver diameter", "speaker driver size", "speaker size", "حجم المحرك الصوتي"],
  playback_time: ["playtime", "music playback time", "earbud battery life"],
  battery_with_case: ["total battery life", "total playback with case", "playback with case"],
  max_output: ["maximum output", "maximum charging power", "max power", "output power"],
  port_count: ["number of ports", "ports count", "عدد منافذ"],
  ports: ["port type", "port types", "connectors", "connectivity ports", "منافذ"],
  compatibility: ["compatible devices", "supported devices", "توافق الجهاز"],
  cable_included: ["includes cable", "charging cable included", "مرفق كابل"],
};

function parseRow(raw: string): [string, string] | null {
  const row = raw.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/u, "").trim();
  if (!row || /^#{1,6}\s/u.test(row) || /^[-|:\s]+$/u.test(row)) return null;

  // Markdown: | Screen size | 6.7 inches |
  if (row.startsWith("|")) {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length === 3 && cells[0] && cells[2]) {
      return /^(?:key|field|attribute)$/iu.test(cells[0]) ? null : [cells[0], cells[2]];
    }
    if (cells.length === 2 && cells[0] && cells[1] &&
        !/^(?:label|field|attribute|المواصفة|اسم المواصفة)$/iu.test(cells[0])) {
      return [cells[0], cells[1]];
    }
    return null;
  }

  // Portable 3-column TSV: key, human label, value. A stable key avoids
  // confusion when multiple sections happen to share a translated label.
  if (row.includes("	")) {
    const cells = row.split(/	+/u).map((cell) => cell.trim());
    if (cells.length === 3 && cells[0] && cells[2]) {
      return /^(?:key|field|attribute)$/iu.test(cells[0]) ? null : [cells[0], cells[2]];
    }
    if (cells.length === 2 && cells[0] && cells[1]) return [cells[0], cells[1]];
    return null;
  }

  // Manufacturer text or simple key/value lines.
  const match = /^(.{1,140}?)(?:\t+|\s*[:：=]\s*)(.+)$/u.exec(row);
  if (!match) return null;
  const label = match[1].replace(/^\*{1,2}|\*{1,2}$/g, "").trim();
  const value = match[2].trim();
  if (!label || !value || /^(?:label|field|attribute)$/i.test(label)) return null;
  return [label, value];
}

export function parseSpecificationImport(
  raw: string,
  template: ProductSpecificationTemplate,
): SpecificationImportResult {
  const text = raw.slice(0, MAX_IMPORT_CHARS);
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const truncated = raw.length > MAX_IMPORT_CHARS || lines.length > MAX_IMPORT_LINES;

  const keys = new Map<string, ProductSpecificationField[]>();
  const labels = new Map<string, ProductSpecificationField[]>();
  const aliases = new Map<string, ProductSpecificationField[]>();
  const index = (target: Map<string, ProductSpecificationField[]>, raw: string, field: ProductSpecificationField) => {
    const label = normalizedLabel(raw);
    if (!label) return;
    const owners = target.get(label) ?? [];
    if (!owners.some((owner) => owner.key === field.key)) owners.push(field);
    target.set(label, owners);
  };
  for (const section of template.sections) {
    for (const field of section.fields) {
      index(keys, field.key, field);
      index(labels, field.label, field);
      if (field.labelAr) index(labels, field.labelAr, field);
      for (const alias of FIELD_ALIASES[field.key] ?? []) index(aliases, alias, field);
    }
  }

  const matches: SpecificationImportMatch[] = [];
  const skipped: SpecificationImportSkipped[] = [];
  const seen = new Set<string>();
  lines.slice(0, MAX_IMPORT_LINES).forEach((rawLine, index) => {
    const parsed = parseRow(rawLine);
    if (!parsed) return;
    const [label, value] = parsed;
    const normalized = normalizedLabel(label);
    const owners = keys.get(normalized) ?? labels.get(normalized) ?? aliases.get(normalized) ?? [];
    const reason = owners.length === 0 ? "unmatched" :
      owners.length > 1 ? "ambiguous" :
      seen.has(owners[0].key) ? "duplicate" :
      !value.trim() || /^(?:n\/a|not applicable|unknown|غير معروف|غير متوفر|-|—)$/iu.test(value) ? "empty" :
      value.length > MAX_SPEC_VALUE_CHARS ? "too_long" : null;

    if (reason) {
      skipped.push({ line: index + 1, label: label.slice(0, 140), reason });
      return;
    }

    const field = owners[0];
    seen.add(field.key);
    matches.push({
      key: field.key,
      label: field.label,
      ...(field.labelAr ? { labelAr: field.labelAr } : {}),
      value: value.normalize("NFKC").trim(),
      line: index + 1,
    });
  });

  return { matches, skipped, truncated };
}

export function specificationImportPatch(
  result: SpecificationImportResult,
  current: ProductSpecificationValues,
  overwrite: boolean,
): ProductSpecificationValues {
  const patch: ProductSpecificationValues = {};
  for (const row of result.matches) {
    if (overwrite || !current[row.key]?.trim()) {
      if (current[row.key]?.trim() !== row.value) patch[row.key] = row.value;
    }
  }
  return patch;
}

/** Export only populated fields; paste the resulting text back to import it. */
export function exportSpecifications(
  template: ProductSpecificationTemplate,
  values: ProductSpecificationValues,
  ar: boolean,
): string {
  return template.sections.flatMap((section) =>
    section.fields.flatMap((field) => {
      const value = values[field.key]?.trim();
      return value
        ? [
          field.key + "\t" +
          (ar ? field.labelAr || field.label : field.label).replace(/[\t\r\n]+/g, " ") + "\t" +
          value.replace(/[\t\r\n]+/g, " "),
        ]
        : [];
    }),
  ).join("\n");
}
