import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  model,
  categoryData,
  categoryForm,
  categoryPage,
  productData,
  productForm,
  productEditor,
  aiEdge,
  nativeStore,
  storeTypes,
  productRoute,
  migration,
  atomicSpecificationMigration,
  categoryEditor,
  bilingualSpecificationMigration,
  requiredCategoriesMigration,
] = await Promise.all([
  readFile(new URL("../src/lib/productSpecifications.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/categories.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../src/dashboard/components/categories/CategoryForm.tsx", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/dashboard/pages/CategoriesPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../src/dashboard/components/products/ProductSpecificationEditor.tsx", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../supabase/functions/dashboard-ai-assist/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/nativeStore.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/storeTypes.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/product.$handle.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../supabase/migrations/20260928084519_product_specifications_end_to_end_20260928.sql", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../supabase/migrations/20260928084532_atomic_product_editor_specifications_20260928.sql", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/dashboard/components/categories/CategorySpecificationTemplateEditor.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../supabase/migrations/20260928090356_bilingual_product_specification_labels_20260928.sql", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../supabase/migrations/20260928091233_complete_required_product_categories_20260928.sql", import.meta.url),
    "utf8",
  ),
]);

test("category specification templates are editable and persisted", () => {
  assert.match(model, /ProductSpecificationTemplate/);
  assert.match(model, /normalizeSpecificationTemplate/);
  assert.match(categoryData, /specTemplate: ProductSpecificationTemplate/);
  assert.match(categoryData, /row\.spec_template/);
  assert.match(categoryData, /spec_template: specificationTemplateToJson\(category\.specTemplate\)/);
  assert.match(categoryData, /update_store_category_with_spec_template/);
  assert.match(categoryData, /p_spec_template: specificationTemplateToJson\(category\.specTemplate\)/);
  assert.match(categoryForm, /CategorySpecificationTemplateEditor/);
  assert.match(categoryForm, /value=\{draft\.specTemplate\}/);
  assert.match(categoryPage, /specTemplate: \{ sections: \[\] \}/);
});

test("product editor reads, validates and saves only category-defined specifications", () => {
  assert.match(productData, /specifications: ProductSpecificationValues/);
  assert.match(productData, /specTemplate: ProductSpecificationTemplate/);
  assert.match(productData, /spec_template/);
  assert.match(productData, /normalizeProductSpecifications\(row\.specifications\)/);
  assert.match(productData, /productSpecificationsToJson/);
  assert.match(productData, /p_specifications: productSpecificationsToJson/);
  assert.match(productData, /p_collection_ids: \[\.\.\.new Set\(input\.collectionIds\)\]/);
  assert.match(productForm, /ProductSpecificationEditor/);
  assert.match(productForm, /const specificationTemplate = selectedCategory\?\.specTemplate/);
  assert.match(productForm, /normalizeProductSpecifications\(current, nextTemplate\)/);
  assert.match(productForm, /validateSpecificationValue/);
  assert.match(productForm, /specifications: cleanSpecifications/);
  assert.match(productEditor, /AI Fill Specifications/);
  assert.match(productEditor, /AI Section/);
  assert.match(productEditor, /AI · review/);
});

test("AI specification fields are category-scoped and ungrounded values are blocked", () => {
  assert.match(aiEdge, /"specKeys"/);
  assert.match(aiEdge, /function contextSpecificationKeys/);
  assert.match(aiEdge, /function allowedAiFieldKey/);
  assert.match(aiEdge, /entity === "product" && key\.startsWith\("spec__"\)/);
  assert.match(aiEdge, /contextSpecificationKeys\(context\)\.has\(specKey\)/);
  assert.match(aiEdge, /field\.startsWith\("spec__"\)\) return "high"/);
  assert.match(aiEdge, /Specification requires direct grounded evidence for the exact product/);
  assert.match(aiEdge, /Dynamic product fields beginning with spec__/);
  assert.match(productForm, /specKeys: specificationKeys\(specificationTemplate\)/);
  assert.match(productForm, /review: true/);
  assert.doesNotMatch(aiEdge, /\.(?:insert|update|upsert|delete)\(/);
});

test("storefront hydrates category templates and renders structured specification groups", () => {
  assert.match(storeTypes, /specificationGroups\?: Array/);
  assert.match(nativeStore, /category_id/);
  assert.match(nativeStore, /specifications/);
  assert.match(nativeStore, /STOREFRONT_CATEGORY_SELECT/);
  assert.match(nativeStore, /specificationGroups\(category\?\.spec_template, row\.specifications\)/);
  assert.match(nativeStore, /categoriesById/);
  assert.match(productRoute, /node\.specificationGroups \?\? \[\]/);
  assert.match(productRoute, /return \[\.\.\.structuredGroups, \.\.\.groupSpecs\(fallbackRows\)\]/);
  assert.match(productRoute, /structuredLabels/);
});

test("database migration preserves existing values and constrains specification JSON", () => {
  assert.match(migration, /add column if not exists spec_template jsonb not null/);
  assert.match(migration, /add column if not exists specifications jsonb not null/);
  assert.match(migration, /store_categories_spec_template_shape/);
  assert.match(migration, /store_products_specifications_shape/);
  assert.match(migration, /jsonb_array_length\(spec_template -> 'sections'\) <= 16/);
  assert.match(migration, /pg_column_size\(specifications\) <= 65536/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /private\.is_dashboard_staff\(\)/);
  assert.match(migration, /grant select \(spec_template\)/);
  assert.match(migration, /grant select \(specifications\)/);
  assert.match(atomicSpecificationMigration, /p_specifications jsonb/);
  assert.match(atomicSpecificationMigration, /specifications = v_specifications/);
  assert.match(
    atomicSpecificationMigration,
    /product specification field is not allowed for this category/,
  );
  assert.match(atomicSpecificationMigration, /perform public\.set_store_product_collections/);
  assert.match(
    atomicSpecificationMigration,
    /grant execute on function public\.save_store_product_editor/,
  );
  assert.doesNotMatch(migration, /delete from public\.store_products/);
  assert.doesNotMatch(migration, /update public\.store_categories\s+set spec_template =/);
});


test("specification templates preserve Arabic labels end to end", () => {
  assert.match(model, /labelAr\?: string/);
  assert.match(model, /titleAr\?: string/);
  assert.match(categoryEditor, /Specification section title in Arabic/);
  assert.match(categoryEditor, /Specification field label in Arabic/);
  assert.match(storeTypes, /titleAr\?: string/);
  assert.match(storeTypes, /labelAr\?: string/);
  assert.match(productRoute, /language === "ar" \? group\.titleAr/);
  assert.match(productRoute, /language === "ar" \? row\.labelAr/);
  assert.match(bilingualSpecificationMigration, /private\.spacecall_spec_section_ar/);
  assert.match(bilingualSpecificationMigration, /private\.spacecall_spec_field_ar/);
  assert.match(bilingualSpecificationMigration, /labelAr/);
  assert.match(bilingualSpecificationMigration, /titleAr/);
});

test("required Headphones and Bags categories are specification-aware", () => {
  assert.match(requiredCategoriesMigration, /'Headphones'/);
  assert.match(requiredCategoriesMigration, /'headphones'/);
  assert.match(requiredCategoriesMigration, /'Bags'/);
  assert.match(requiredCategoriesMigration, /'bags'/);
  assert.match(requiredCategoriesMigration, /'titleAr'/);
  assert.match(requiredCategoriesMigration, /'labelAr'/);
  assert.match(requiredCategoriesMigration, /is_active,[\s\S]*false/);
});
