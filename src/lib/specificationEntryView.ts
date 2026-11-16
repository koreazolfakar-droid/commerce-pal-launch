import type {
  ProductSpecificationTemplate,
  ProductSpecificationValues,
} from "@/lib/productSpecifications";

/** A filter must never unmount an input the merchant is currently editing. */
export type SpecificationFieldView = "all" | "missing" | "filled";

export function visibleSpecificationSections(
  template: ProductSpecificationTemplate,
  values: ProductSpecificationValues,
  view: SpecificationFieldView,
  search: string,
  editedVisibleKeys: ReadonlySet<string>,
): ProductSpecificationTemplate["sections"] {
  const query = search.normalize("NFKC").trim().toLocaleLowerCase();
  return template.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => {
        const populated = Boolean(values[field.key]?.trim());
        const passesFilter = view === "all" || editedVisibleKeys.has(field.key) ||
          (view === "missing" ? !populated : populated);
        const passesSearch = !query ||
          [field.label, field.labelAr, field.key, field.unit].some((label) =>
            label?.normalize("NFKC").toLocaleLowerCase().includes(query));
        return passesFilter && passesSearch;
      }),
    }))
    .filter((section) => section.fields.length);
}

export function nextMissingSpecificationKey(
  template: ProductSpecificationTemplate,
  values: ProductSpecificationValues,
): string | null {
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!values[field.key]?.trim()) return field.key;
    }
  }
  return null;
}
