import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const [pageSource, dataSource, rpcSource] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/lib/rpcArgs.ts", import.meta.url), "utf8"),
]);
function extract(source, name) {
  const file = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let result;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(file);
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name)
      result = `const ${node.getText(file)};`;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(result, `Missing production function: ${name}`);
  return result;
}
function evaluate(source, dependencies, result) {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function("exports", ...Object.keys(dependencies), `${js}\nreturn ${result};`)(
    {},
    ...Object.values(dependencies),
  );
}
const draft = {
  title: "Product",
  description: "Edited description",
  brandId: "",
  categoryId: "",
  status: "Active",
  price: "100",
  compareAt: "",
  sku: "SKU",
  barcode: "",
  stock: "10",
  imageUrl: "",
  seoTitle: "",
  seoDescription: "",
};
function editor({
  id = "product-id",
  variantCount = 1,
  baseline = 10,
  stock = "10",
  savedStock = 9,
  currentStock = stock,
  error,
  color = "",
  storage = "",
  images = [],
} = {}) {
  const calls = {
    payload: [],
    baseline: [],
    formStock: [],
    errors: [],
    success: [],
    saving: [],
    navigation: [],
    variants: [],
    sequence: [],
  };
  const dependencies = {
    id,
    existing: { price: 100, compareAt: null, sku: "SKU", barcode: "", stock: baseline },
    variantCount,
    variantLocked: variantCount > 1,
    stockBaseline: baseline,
    form: { ...draft, stock, ...(id ? {} : { status: "Draft" }) },
    pendingImages: images,
    newVariantColor: color,
    newVariantStorage: storage,
    specificationTemplate: { sections: [] },
    specifications: {},
    collectionIds: [],
    persistedCollectionIds: [],
    brands: [],
    categories: [],
    validateProductDraft: () => ({ valid: true }),
    validateSpecificationValue: () => null,
    normalizeProductSpecifications: (value) => value,
    saveDashboardProduct: async (input) => {
      calls.payload.push(input);
      calls.sequence.push(`save:${input.status}`);
      if (error) throw error;
      return { id: "product-id", stock: savedStock, variantManagedSeparately: variantCount > 1 };
    },
    loadDashboardProductVariants: async () => ({
      variants: [
        {
          id: "variant-id",
          title: "Default",
          sku: "SKU",
          barcode: "",
          price: 100,
          compareAt: null,
          stock: savedStock,
          trackInventory: true,
          allowBackorder: false,
          options: {},
          imageUrl: "",
          sortOrder: 0,
          isActive: true,
        },
      ],
    }),
    updateDashboardProductVariant: async (_id, input) => {
      calls.variants.push(input);
      calls.sequence.push("variant");
    },
    uploadDashboardProductImage: async () => {
      calls.sequence.push("image");
      return { image: { url: "https://example.test/product.webp" } };
    },
    getProductImageResolution: () => "standard",
    t: (value) => value,
    setStockBaseline: (value) => calls.baseline.push(value),
    setForm: (updater) => calls.formStock.push(updater({ ...draft, stock: currentStock }).stock),
    setExisting: () => {},
    markDraftSaved: () => {},
    setPersistedCollectionIds: () => {},
    setSpecifications: () => {},
    setAiSpecificationKeys: () => {},
    setSaved: () => {},
    setFieldErrors: () => {},
    setPublishError: () => {},
    setUploadedImageCount: () => {},
    setVariantRevision: () => {},
    setSaving: (value) => calls.saving.push(value),
    toast: {
      success: (message) => calls.success.push(message),
      error: (message) => calls.errors.push(message),
    },
    navigate: (path) => calls.navigation.push(path),
  };
  return { save: evaluate(extract(pageSource, "handleSave"), dependencies, "handleSave"), calls };
}

test("description-only save requests stock preservation and adopts the server's current quantity", async () => {
  const { save, calls } = editor();
  await save();
  assert.equal(calls.payload[0].expectedStock, null);
  assert.equal(calls.payload[0].stock, 10);
  assert.deepEqual(calls.baseline, [9]);
  assert.deepEqual(calls.formStock, ["9"]);
});

test("a stock edit typed while saving remains a draft against the returned baseline", async () => {
  const { save, calls } = editor({ currentStock: "12", savedStock: 9 });
  await save();
  assert.equal(calls.payload[0].expectedStock, null);
  assert.deepEqual(calls.baseline, [9]);
  assert.deepEqual(calls.formStock, ["12"]);
});

test("intentional stock change uses the loaded snapshot, not the desired new quantity", async () => {
  const { save, calls } = editor({ stock: "12", savedStock: 12 });
  await save();
  assert.equal(calls.payload[0].expectedStock, 10);
  assert.equal(calls.payload[0].stock, 12);
  assert.deepEqual(calls.baseline, [12]);
});

test("new products retain their initial stock without an existing-stock expectation", async () => {
  const create = editor({ id: null, stock: "15", savedStock: 15 });
  await create.save();
  assert.equal(create.calls.payload[0].expectedStock, null);
  assert.equal(create.calls.payload[0].stock, 15);
  assert.deepEqual(create.calls.navigation, ["/dashboard/products/product-id"]);
});

test("new color and storage are persisted before a product with an image is published", async () => {
  const create = editor({
    id: null,
    color: "Graphite",
    storage: "256GB",
    images: [{ file: { name: "photo.jpg" } }],
  });
  await create.save("Active");
  assert.deepEqual(create.calls.sequence, ["save:Draft", "image", "variant", "save:Active"]);
  assert.deepEqual(create.calls.variants[0].options, { color: "Graphite", storage: "256GB" });
  assert.equal(create.calls.payload[1].imageUrl, "https://example.test/product.webp");
});

test("multi-variant saves keep inventory outside the compact editor", async () => {
  const { save, calls } = editor({ variantCount: 2, stock: "12", savedStock: 20 });
  await save();
  assert.equal(calls.payload[0].expectedStock, null);
  assert.deepEqual(calls.baseline, []);
  assert.deepEqual(calls.formStock, []);
});

test("a rejected stock adjustment keeps the draft and does not report success", async () => {
  const { save, calls } = editor({ stock: "12", error: new Error("Stock conflict") });
  await save();
  assert.deepEqual(calls.errors, ["Stock conflict"]);
  assert.deepEqual(calls.success, []);
  assert.deepEqual(calls.baseline, []);
  assert.deepEqual(calls.formStock, []);
  assert.deepEqual(calls.saving, [true, false]);
});

test("variant-manager snapshots update the expected-stock baseline", () => {
  const baseline = [];
  const changed = evaluate(
    extract(pageSource, "handleSingleVariantChange"),
    {
      useCallback: (fn) => fn,
      setStockBaseline: (value) => baseline.push(value),
      setExisting: () => {},
      setForm: () => {},
    },
    "handleSingleVariantChange",
  );
  changed({ stock: 7, price: 100, compareAt: null, sku: "SKU", barcode: "" });
  assert.deepEqual(baseline, [7]);
});

test("data transport sends the stock snapshot and translates the server conflict", async () => {
  const calls = [];
  let response = {
    data: { id: "product-id", handle: "product", stock: 12, variant_managed_separately: false },
    error: null,
  };
  const save = evaluate(
    [
      extract(dataSource, "saveDashboardProduct"),
      extract(dataSource, "throwIfError"),
      extract(dataSource, "statusToDb"),
      extract(rpcSource, "rpcArgs"),
    ].join("\n"),
    {
      requireDashboardRole: async () => "editor",
      looseSupabase: {
        rpc: async (...args) => {
          calls.push(args);
          return response;
        },
      },
      normalizeProductSpecifications: (value) => value,
      productSpecificationsToJson: (value) => value,
      invalidateNativeStoreCache: () => {},
      broadcastStorefrontRefresh: () => {},
    },
    "saveDashboardProduct",
  );
  const input = {
    ...draft,
    id: "product-id",
    price: 100,
    compareAt: null,
    stock: 12,
    expectedStock: 10,
    specifications: {},
    collectionIds: [],
  };
  assert.equal((await save(input)).stock, 12);
  assert.equal(calls[0][1].p_expected_stock, 10);
  response = { data: null, error: { message: "product_editor_stock_conflict" } };
  await assert.rejects(save(input), /Stock changed in another session/);
  assert.equal(calls.length, 2);
});

// Execute the real migration in embedded PostgreSQL without production writes.
const pgliteModule = process.env.SPACE_CALL_PGLITE_MODULE || "@electric-sql/pglite";
test("PostgreSQL executes the guarded stock migration against inventory regression scenarios", async () => {
  const { PGlite } = await import(pgliteModule);
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("./fixtures/product-editor-stock-schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const nativeCatalog = await readFile(
      new URL("../supabase/migrations/20260916111500_native_store_catalog.sql", import.meta.url),
      "utf8",
    );
    const summaryTrigger = nativeCatalog.slice(
      nativeCatalog.indexOf("create or replace function private.store_sync_product_summary()"),
      nativeCatalog.indexOf("drop trigger if exists store_categories_touch_updated_at"),
    );
    await db.exec(summaryTrigger);
    await db.exec(
      "create trigger variant_summary after insert or update or delete on store_product_variants for each row execute function private.store_sync_product_summary();",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260928061000_atomic_product_editor_specifications.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261005000000_product_editor_stock_concurrency.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from pg_proc where proname = 'save_store_product_editor'",
        )
      ).rows[0].count,
      2,
    );
    const guardedSignature =
      "save_store_product_editor(uuid,text,text,uuid,uuid,text,numeric,numeric,text,text,integer,text,text,text,jsonb,uuid[],integer)";
    assert.deepEqual(
      (
        await db.query(
          "select has_function_privilege('anon',$1,'execute') as anon, has_function_privilege('authenticated',$1,'execute') as staff",
          [guardedSignature],
        )
      ).rows,
      [{ anon: false, staff: true }],
    );
    const productId = "00000000-0000-4000-8000-000000000001";
    await db.exec(
      `insert into store_products(id,title,handle,stock_quantity,track_inventory) values ('${productId}','Original','original',10,false); insert into store_product_variants(product_id,title,price,stock_quantity,track_inventory,is_active) values ('${productId}','Default',100,10,false,true);`,
    );
    async function save({
      id = productId,
      stock = 10,
      expected = null,
      title = "Edited",
      collections = [],
      categoryId = null,
      specifications = {},
      imageUrl = "",
    } = {}) {
      const result = await db.query(
        "select save_store_product_editor($1::uuid,$2::text,'Description',null::uuid,$6::uuid,'active',100::numeric,null::numeric,'SKU','',$3::integer,$8::text,'','',$7::jsonb,$4::uuid[],$5::integer) as saved",
        [
          id,
          title,
          stock,
          collections,
          expected,
          categoryId,
          JSON.stringify(specifications),
          imageUrl,
        ],
      );
      return result.rows[0].saved;
    }
    const state = async () =>
      (
        await db.query(
          "select stock_quantity,track_inventory,is_active from store_product_variants where product_id=$1",
          [productId],
        )
      ).rows;
    // A sale occurs after the editor was opened at stock 10.
    await db.exec(
      `update store_product_variants set stock_quantity=9 where product_id='${productId}';`,
    );
    assert.equal((await save()).stock, 9);
    assert.equal((await state())[0].stock_quantity, 9);
    assert.equal(
      (await db.query("select count(*)::integer as count from store_inventory_movements")).rows[0]
        .count,
      0,
    );
    // An intentional adjustment based on that old snapshot must roll back all edits.
    await assert.rejects(
      save({ stock: 12, expected: 10, title: "Must roll back" }),
      /product_editor_stock_conflict/,
    );
    assert.equal(
      (await db.query("select title from store_products where id=$1", [productId])).rows[0].title,
      "Edited",
    );
    assert.equal((await save({ stock: 12, expected: 9 })).stock, 12);
    assert.deepEqual(
      (await db.query("select quantity_delta from store_inventory_movements")).rows,
      [{ quantity_delta: 3 }],
    );
    assert.equal((await state())[0].track_inventory, false);
    assert.equal(
      (await db.query("select track_inventory from store_products where id=$1", [productId]))
        .rows[0].track_inventory,
      false,
    );
    // Preserve disabled variants and their quantity on unrelated saves.
    await db.exec(
      `update store_product_variants set is_active=false where product_id='${productId}';`,
    );
    assert.equal((await save()).stock, 12);
    assert.equal((await state())[0].is_active, false);
    // Invalid collection assignment rolls back an otherwise valid adjustment.
    await assert.rejects(
      save({ stock: 14, expected: 12, collections: ["00000000-0000-4000-8000-000000000099"] }),
      /invalid collection/,
    );
    assert.equal((await state())[0].stock_quantity, 12);
    assert.equal(
      (await db.query("select count(*)::integer as count from store_inventory_movements")).rows[0]
        .count,
      1,
    );
    // Multi-variant products remain independent of the compact stock field.
    await db.exec(
      `insert into store_product_variants(product_id,title,price,stock_quantity) values ('${productId}','Second',110,5);`,
    );
    assert.equal((await save({ stock: 999, expected: 12 })).variant_managed_separately, true);
    assert.deepEqual(
      (await state()).map((row) => row.stock_quantity).sort((a, b) => a - b),
      [5, 12],
    );
    // Creation still provisions a default variant and the initial inventory movement.
    const created = await save({ id: null, stock: 15 });
    assert.equal(created.stock, 15);
    assert.equal(
      (
        await db.query("select stock_quantity from store_product_variants where product_id=$1", [
          created.id,
        ])
      ).rows[0].stock_quantity,
      15,
    );
    assert.deepEqual(
      (
        await db.query("select quantity_delta from store_inventory_movements where product_id=$1", [
          created.id,
        ])
      ).rows,
      [{ quantity_delta: 15 }],
    );
    // Existing products without variants retain their current initial quantity.
    const emptyProductId = "00000000-0000-4000-8000-000000000002";
    await db.exec(
      `insert into store_products(id,title,handle,stock_quantity) values ('${emptyProductId}','Without variant','without-variant',4);`,
    );
    assert.equal((await save({ id: emptyProductId, stock: 999 })).stock, 4);
    // Specifications and primary image metadata still save in the same transaction.
    const categoryId = "00000000-0000-4000-8000-000000000003";
    await db.query(
      "insert into store_categories(id,name,spec_template) values ($1,'Phones',$2::jsonb)",
      [categoryId, JSON.stringify({ sections: [{ fields: [{ key: "memory" }] }] })],
    );
    const imageUrl = "https://example.com/product.webp";
    await save({
      id: created.id,
      stock: 999,
      categoryId,
      specifications: { memory: "256 GB" },
      imageUrl,
    });
    assert.deepEqual(
      (await db.query("select specifications from store_products where id=$1", [created.id]))
        .rows[0].specifications,
      { memory: "256 GB" },
    );
    assert.deepEqual(
      (
        await db.query("select url,is_primary from store_product_images where product_id=$1", [
          created.id,
        ])
      ).rows,
      [{ url: imageUrl, is_primary: true }],
    );
    assert.equal(
      (
        await db.query("select stock_quantity from store_product_variants where product_id=$1", [
          created.id,
        ])
      ).rows[0].stock_quantity,
      15,
    );
  } finally {
    await db.close();
  }
});
