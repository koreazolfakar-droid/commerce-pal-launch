import type { Json } from "@/integrations/supabase/types";

export type ProductSpecificationField = {
  key: string;
  label: string;
  labelAr?: string;
  unit?: string;
};

export type ProductSpecificationSection = {
  title: string;
  titleAr?: string;
  fields: ProductSpecificationField[];
};

export type ProductSpecificationTemplate = {
  sections: ProductSpecificationSection[];
};

export type ProductSpecificationValues = Record<string, string>;

export type ProductSpecificationGroup = {
  title: string;
  titleAr?: string;
  rows: Array<{ label: string; labelAr?: string; value: string }>;
};

const MAX_SECTIONS = 16;
const MAX_FIELDS_PER_SECTION = 24;
const MAX_SPEC_VALUE_LENGTH = 500;

export function normalizeSpecificationKey(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : "";
}

export function normalizeSpecificationTemplate(value: unknown): ProductSpecificationTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { sections: [] };
  const sectionsValue = (value as { sections?: unknown }).sections;
  if (!Array.isArray(sectionsValue)) return { sections: [] };

  const seen = new Set<string>();
  const sections: ProductSpecificationSection[] = [];

  for (const rawSection of sectionsValue.slice(0, MAX_SECTIONS)) {
    if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) continue;
    const section = rawSection as Record<string, unknown>;
    const title = cleanText(section.title, 80) || "Specifications";
    const titleAr = cleanText(section.titleAr, 80);
    const rawFields = Array.isArray(section.fields) ? section.fields : [];
    const fields: ProductSpecificationField[] = [];

    for (const rawField of rawFields.slice(0, MAX_FIELDS_PER_SECTION)) {
      if (!rawField || typeof rawField !== "object" || Array.isArray(rawField)) continue;
      const field = rawField as Record<string, unknown>;
      const key = normalizeSpecificationKey(cleanText(field.key, 80));
      const label = cleanText(field.label, 100);
      const labelAr = cleanText(field.labelAr, 100);
      const unit = cleanText(field.unit, 30);

      if (!key || !label || seen.has(key)) continue;
      seen.add(key);
      fields.push({
        key,
        label,
        ...(labelAr ? { labelAr } : {}),
        ...(unit ? { unit } : {}),
      });
    }

    if (fields.length) {
      sections.push({
        title,
        ...(titleAr ? { titleAr } : {}),
        fields,
      });
    }
  }

  return { sections };
}

export function specificationKeys(template: ProductSpecificationTemplate) {
  return template.sections.flatMap((section) => section.fields.map((field) => field.key));
}

export function normalizeProductSpecifications(
  value: unknown,
  template?: ProductSpecificationTemplate,
): ProductSpecificationValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const document = value as Record<string, unknown>;
  // Historical catalog rows use { values: {...}, keySpecs: [...] }, while
  // product-editor mutations submit the flat key/value map. Read both formats
  // without exposing document metadata as product specification fields.
  const source =
    document.values &&
    typeof document.values === "object" &&
    !Array.isArray(document.values) &&
    Array.isArray(document.keySpecs)
      ? (document.values as Record<string, unknown>)
      : document;
  const allowed = template ? new Set(specificationKeys(template)) : null;
  const result: ProductSpecificationValues = {};

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = normalizeSpecificationKey(rawKey);
    if (!key || (allowed && !allowed.has(key))) continue;
    if (!["string", "number", "boolean"].includes(typeof rawValue)) continue;
    const next = String(rawValue).normalize("NFKC").trim().slice(0, MAX_SPEC_VALUE_LENGTH);
    if (next) result[key] = next;
  }

  return result;
}

export function specificationTemplateToJson(template: ProductSpecificationTemplate): Json {
  return normalizeSpecificationTemplate(template) as unknown as Json;
}

export function productSpecificationsToJson(values: ProductSpecificationValues): Json {
  return normalizeProductSpecifications(values) as unknown as Json;
}

function hasUnit(value: string, unit: string) {
  const normalizedValue = value.toLowerCase();
  const normalizedUnit = unit.toLowerCase();
  return normalizedValue.includes(normalizedUnit);
}

export function displaySpecificationValue(value: string, unit?: string) {
  const trimmed = value.trim();
  if (!trimmed || !unit || hasUnit(trimmed, unit)) return trimmed;

  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "bluetooth") return `Bluetooth ${trimmed}`;
  if (normalizedUnit === "inches" || normalizedUnit === "inch") {
    if (/["″]$/.test(trimmed) || /\b(?:in|inch|inches)\b/i.test(trimmed)) return trimmed;
    return `${trimmed} in`;
  }
  return `${trimmed} ${unit}`;
}

export function specificationGroups(
  templateValue: unknown,
  specificationValue: unknown,
): ProductSpecificationGroup[] {
  const template = normalizeSpecificationTemplate(templateValue);
  // Older products and categories without a current template may still have
  // valid saved spec values. Do not silently hide those Dashboard fields.
  if (template.sections.length === 0) {
    const savedValues = normalizeProductSpecifications(specificationValue);
    const rows = Object.entries(savedValues).map(([key, value]) => ({
      label: key.replace(/_/g, " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase()),
      value,
    }));
    return rows.length ? [{ title: "Specifications", rows }] : [];
  }

  const values = normalizeProductSpecifications(specificationValue, template);

  return template.sections
    .map((section) => ({
      title: section.title,
      ...(section.titleAr ? { titleAr: section.titleAr } : {}),
      rows: section.fields
        .map((field) => ({
          label: field.label,
          ...(field.labelAr ? { labelAr: field.labelAr } : {}),
          value: displaySpecificationValue(values[field.key] ?? "", field.unit),
        }))
        .filter((row) => row.value),
    }))
    .filter((section) => section.rows.length);
}

export function aiSpecificationFieldKey(specKey: string) {
  return `spec__${normalizeSpecificationKey(specKey)}`;
}

export function specificationKeyFromAiField(field: string) {
  if (!field.startsWith("spec__")) return "";
  return normalizeSpecificationKey(field.slice("spec__".length));
}

export function validateSpecificationValue(field: ProductSpecificationField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const unit = field.unit?.trim().toLowerCase();
  if (!unit) return "";

  const numberLikeUnits = new Set(["gb", "tb", "mb", "mah", "w", "hz", "inches", "inch"]);
  if (numberLikeUnits.has(unit) && !/\d/.test(trimmed)) {
    return `${field.label} should include a numeric value for ${field.unit}.`;
  }

  if (unit === "bluetooth" && !/\d/.test(trimmed)) {
    return `${field.label} should include a Bluetooth version number.`;
  }

  return "";
}
