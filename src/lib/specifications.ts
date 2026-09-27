import type { SpecGroup } from "@/lib/productContent";

export type SpecField = { key: string; label: string; unit?: string };
export type SpecSection = { title: string; fields: SpecField[] };
export type SpecTemplate = { sections: SpecSection[] };
export type ProductSpecifications = {
  values: Record<string, string>;
  keySpecs: string[];
  legacy?: unknown;
};

export const EMPTY_SPECS: ProductSpecifications = { values: {}, keySpecs: [] };
export const EMPTY_TEMPLATE: SpecTemplate = { sections: [] };

const KEY = /^[a-z][a-z0-9_]{0,39}$/;
const UNITS: Record<string, RegExp> = {
  GB: /^\d+(?:\.\d+)?\s*GB$/i,
  TB: /^\d+(?:\.\d+)?\s*TB$/i,
  mAh: /^\d+(?:\.\d+)?\s*mAh$/i,
  W: /^\d+(?:\.\d+)?\s*W$/i,
  Hz: /^\d+(?:\.\d+)?\s*Hz$/i,
  inches: /^\d+(?:\.\d+)?\s*(?:inches|inch|in|″|")$/i,
  Bluetooth: /^(?:Bluetooth\s*)?\d+\.\d+$/i,
};

/** Normalizes an editable category specification template into the supported contract. */
export function parseTemplate(raw: unknown): SpecTemplate {
  if (!raw || typeof raw !== "object" || !("sections" in raw) || !Array.isArray(raw.sections)) {
    return EMPTY_TEMPLATE;
  }

  const seen = new Set<string>();
  return {
    sections: raw.sections.slice(0, 12).flatMap((section) => {
      if (
        !section ||
        typeof section !== "object" ||
        typeof section.title !== "string" ||
        !Array.isArray(section.fields)
      ) {
        return [];
      }

      const fields: SpecField[] = section.fields.slice(0, 30).flatMap((field: unknown) => {
        if (!field || typeof field !== "object") return [];
        const row = field as Record<string, unknown>;
        if (
          typeof row.key !== "string" ||
          !KEY.test(row.key) ||
          seen.has(row.key) ||
          typeof row.label !== "string" ||
          !row.label.trim()
        ) {
          return [];
        }

        seen.add(row.key);
        return [
          {
            key: row.key,
            label: row.label.trim().slice(0, 80),
            ...(typeof row.unit === "string" && row.unit ? { unit: row.unit } : {}),
          },
        ];
      });

      return fields.length
        ? [{ title: section.title.trim().slice(0, 80) || "Details", fields }]
        : [];
    }),
  };
}

/**
 * Reads structured specifications without discarding older documents.
 * Unsupported legacy payloads are retained under `legacy` so a normal dashboard save is lossless.
 */
export function parseSpecifications(raw: unknown): ProductSpecifications {
  if (raw == null) return EMPTY_SPECS;

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { values: {}, keySpecs: [], legacy: raw };
  }

  const row = raw as Record<string, unknown>;
  if (Object.keys(row).length === 0) return EMPTY_SPECS;

  const values: Record<string, string> = {};
  const hasValuesObject = Boolean(
    row.values && typeof row.values === "object" && !Array.isArray(row.values),
  );

  if (hasValuesObject) {
    for (const [key, value] of Object.entries(row.values as Record<string, unknown>)) {
      if (KEY.test(key) && typeof value === "string" && value.trim()) {
        values[key] = value.trim().slice(0, 240);
      }
    }
  }

  const hasKeySpecsArray = Array.isArray(row.keySpecs);
  const keySpecs = hasKeySpecsArray
    ? [
        ...new Set(
          row.keySpecs.filter(
            (key): key is string => typeof key === "string" && KEY.test(key),
          ),
        ),
      ].slice(0, 6)
    : [];

  const legacy =
    "legacy" in row
      ? row.legacy
      : hasValuesObject && hasKeySpecsArray
        ? undefined
        : raw;

  return {
    values,
    keySpecs,
    ...(legacy !== undefined ? { legacy } : {}),
  };
}

/** Validates category keys, key-spec ordering, lengths and recognized unit formats. */
export function validateSpecifications(
  specs: ProductSpecifications,
  template: SpecTemplate,
): string[] {
  const fields = new Map(
    template.sections.flatMap((section) => section.fields).map((field) => [field.key, field]),
  );
  const errors: string[] = [];

  for (const [key, value] of Object.entries(specs.values)) {
    const field = fields.get(key);
    if (!field) {
      errors.push(`Unknown specification: ${key}`);
    } else if (!value.trim() || value.length > 240) {
      errors.push(`Invalid value for ${field.label}`);
    } else if (field.unit && UNITS[field.unit] && !UNITS[field.unit].test(value.trim())) {
      errors.push(
        `${field.label} must use ${field.unit} (for example: 128 ${field.unit}).`,
      );
    }
  }

  if (specs.keySpecs.length > 6 || new Set(specs.keySpecs).size !== specs.keySpecs.length) {
    errors.push("Select up to 6 distinct key specifications.");
  }

  if (specs.keySpecs.some((key) => !specs.values[key] || !fields.has(key))) {
    errors.push("Key specifications must have saved values in this category.");
  }

  return errors;
}

/** Builds storefront specification groups from one saved structured source. */
export function specificationGroups(
  specs: ProductSpecifications,
  template: SpecTemplate,
): SpecGroup[] {
  return template.sections.flatMap((section) => {
    const rows = section.fields.flatMap((field) =>
      specs.values[field.key]
        ? [{ label: field.label, value: specs.values[field.key] }]
        : [],
    );
    return rows.length ? [{ title: section.title, rows }] : [];
  });
}

/** Resolves the ordered 4–6 shopper-facing key specifications. */
export function keySpecificationRows(
  specs: ProductSpecifications,
  template: SpecTemplate,
) {
  const fields = new Map(
    template.sections.flatMap((section) => section.fields).map((field) => [field.key, field.label]),
  );

  return specs.keySpecs.flatMap((key) =>
    specs.values[key] && fields.has(key)
      ? [{ label: fields.get(key)!, value: specs.values[key] }]
      : [],
  );
}
