export type VariantOptionRow = {
  name: string;
  value: string | number | boolean;
  kind?: "string" | "number" | "boolean";
};

const dedicated = new Set(["color", "colour", "storage", "capacity"]);
const unsafe = new Set(["__proto__", "prototype", "constructor"]);

export function variantOptionRows(
  options: Record<string, string | number | boolean>,
): VariantOptionRow[] {
  return Object.entries(options)
    .filter(([name]) => !dedicated.has(name.trim().toLowerCase()))
    .map(([name, value]) => ({
      name,
      value,
      kind: typeof value as "string" | "number" | "boolean",
    }));
}

export function dedicatedVariantOptionText(
  options: Record<string, string | number | boolean>,
  keys: string[],
) {
  const allowed = new Set(keys.map((key) => key.trim().toLowerCase()));
  for (const [key, value] of Object.entries(options)) {
    if (allowed.has(key.trim().toLowerCase())) return String(value);
  }
  return "";
}

export function buildVariantOptions(
  rows: VariantOptionRow[],
): Record<string, string | number | boolean> {
  const entries: Array<[string, string | number | boolean]> = [];
  const names = new Set<string>();
  for (const row of rows) {
    const name = row.name.trim();
    const text = typeof row.value === "string" ? row.value.trim() : row.value;
    const value = row.kind === "number" && text !== "" ? Number(text) : text;
    if (!name && value === "") continue;
    const key = name.toLowerCase();
    if (!name || name.length > 40 || unsafe.has(key))
      throw new Error("Enter an option name between 1 and 40 characters.");
    if (dedicated.has(key))
      throw new Error("Use the dedicated color or storage field for this option.");
    if (names.has(key)) throw new Error("Option names must be unique.");
    if (
      value === "" ||
      (typeof value === "string" && value.length > 120) ||
      (typeof value === "number" && !Number.isFinite(value))
    )
      throw new Error("Enter an option value between 1 and 120 characters.");
    names.add(key);
    entries.push([name, value]);
  }
  return Object.fromEntries(entries);
}
