import type {
  ProductSpecificationSection,
  ProductSpecificationTemplate,
} from "@/lib/productSpecifications";

/**
 * Non-destructive template expansion: preserve existing field definitions and
 * keys, append only missing fields, and respect current category shape limits.
 */
export type SpecificationTemplateMergeResult = {
  template: ProductSpecificationTemplate;
  added: number;
  alreadyPresent: number;
  skippedForLimit: number;
};

const MAX_SECTIONS = 16;
const MAX_FIELDS_PER_SECTION = 24;

function sectionIdentity(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function cloneSection(source: ProductSpecificationSection): ProductSpecificationSection {
  return { ...source, fields: source.fields.map((field) => ({ ...field })) };
}

export function mergeSpecificationTemplates(
  current: ProductSpecificationTemplate,
  incoming: ProductSpecificationTemplate,
): SpecificationTemplateMergeResult {
  const sections = current.sections.map(cloneSection);
  const used = new Set(sections.flatMap((section) => section.fields.map((field) => field.key)));
  let added = 0;
  let alreadyPresent = 0;
  let skippedForLimit = 0;

  for (const section of incoming.sections) {
    let index = sections.findIndex(
      (existing) => sectionIdentity(existing.title) === sectionIdentity(section.title),
    );
    let destination = index >= 0 ? sections[index] : null;

    // Do not create empty new sections when every field already exists.
    const missing = section.fields.filter((field) => {
      if (used.has(field.key)) {
        alreadyPresent += 1;
        return false;
      }
      return true;
    });
    if (!missing.length) continue;

    if (!destination) {
      if (sections.length >= MAX_SECTIONS) {
        skippedForLimit += missing.length;
        continue;
      }
      destination = { title: section.title, ...(section.titleAr ? { titleAr: section.titleAr } : {}), fields: [] };
      sections.push(destination);
      index = sections.length - 1;
    }

    for (const field of missing) {
      if (used.has(field.key)) {
        alreadyPresent += 1;
      } else if (sections[index].fields.length >= MAX_FIELDS_PER_SECTION) {
        skippedForLimit += 1;
      } else {
        sections[index].fields.push({ ...field });
        used.add(field.key);
        added += 1;
      }
    }
  }

  return { template: { sections }, added, alreadyPresent, skippedForLimit };
}
