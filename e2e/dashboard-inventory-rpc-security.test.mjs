import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260920063000_dashboard_inventory_server_pagination.sql", import.meta.url),
  "utf8",
);

test("inventory RPCs reject anonymous execution at the database grant layer", () => {
  assert.match(
    migration,
    /dashboard_inventory_page\([^)]+\) from public, anon;/,
  );
  assert.match(
    migration,
    /dashboard_inventory_summary\(integer\) from public, anon;/,
  );
});

test("inventory RPCs retain staff authorization checks and required roles", () => {
  assert.match(migration, /auth\.uid\(\) is null/);
  assert.match(migration, /role::text in \('admin', 'editor'\)/);
  assert.match(migration, /to authenticated, service_role;/);
});
