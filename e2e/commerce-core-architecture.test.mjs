import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("commerce core defines platform-neutral domain models and repository ports", async () => {
  const [models, ports] = await Promise.all([
    read("src/commerce/core/models.ts"),
    read("src/commerce/core/ports.ts"),
  ]);

  assert.match(models, /CommerceSource = "native" \| "shopify"/);
  assert.match(models, /CommerceProductSummary/);
  assert.match(models, /CommerceOrder/);
  assert.match(models, /CommerceCustomer/);
  assert.match(models, /InventoryWorkspaceSnapshot/);
  assert.match(ports, /interface AdminCommerceRepository/);
  assert.match(ports, /getCatalogOverview/);
  assert.match(ports, /adjustInventory/);
  assert.match(ports, /updateOrderState/);
  assert.match(ports, /updateCustomerProfile/);
});

test("Supabase is isolated behind an injectable commerce adapter and service facade", async () => {
  const [adapter, service, uiService] = await Promise.all([
    read("src/commerce/adapters/supabaseAdminCommerceRepository.ts"),
    read("src/commerce/services/adminCommerceService.ts"),
    read("src/commerce/services/adminCommerceUiService.ts"),
  ]);

  assert.match(adapter, /@\/integrations\/supabase\/client/);
  assert.match(adapter, /AdminCommerceRepository/);
  assert.match(service, /createAdminCommerceService/);
  assert.match(service, /repository: AdminCommerceRepository/);
  assert.match(service, /createAdminCommerceService\(supabaseAdminCommerceRepository\)/);
  assert.doesNotMatch(service, /@\/integrations\/supabase\/client/);
  assert.doesNotMatch(uiService, /@\/integrations\/supabase\/client/);
});

test("primary dashboard commerce screens do not query Supabase directly", async () => {
  const files = [
    "src/components/admin/CatalogWorkspace.tsx",
    "src/components/admin/InventoryEditor.tsx",
    "src/components/admin/OrdersEditor.tsx",
    "src/components/admin/CustomersEditor.tsx",
  ];

  for (const file of files) {
    const source = await read(file);
    assert.match(source, /adminCommerceUiService/, `${file} must use the commerce service layer`);
    assert.doesNotMatch(
      source,
      /@\/integrations\/supabase\/client/,
      `${file} must not import the Supabase client directly`,
    );
    assert.doesNotMatch(source, /\.from\("store_/, `${file} must not query store tables directly`);
    assert.doesNotMatch(source, /\.rpc\(/, `${file} must not call database RPCs directly`);
  }
});
