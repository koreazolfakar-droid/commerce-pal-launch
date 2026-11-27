import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [storage, procurementMigration] = await Promise.all([
  readFile(
    new URL("../src/integrations/supabase/previewAuthStorage.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL(
      "../supabase/migrations/20260928053000_inventory_procurement_optimistic_concurrency.sql",
      import.meta.url,
    ),
    "utf8",
  ),
]);

test("production Supabase auth remains tab-scoped", () => {
  assert.match(storage, /safeBrowserStorage\('session'\)/);
  assert.match(storage, /return useTabScopedProductionStorage\(\)/);
  assert.match(storage, /legacyStorage\?\.removeItem\(SPACE_CALL_SUPABASE_AUTH_KEY\)/);
  assert.doesNotMatch(
    storage,
    /if \(!projectId \|\| !framed\) return localStorage/,
  );
});

test("procurement migration uses valid PL\/pgSQL dollar quoting", () => {
  assert.doesNotMatch(procurementMigration, /^\s*as \$\s*$/m);
  assert.doesNotMatch(procurementMigration, /^\s*\$;\s*$/m);
  assert.match(
    procurementMigration,
    /update_store_receiving_draft_v2[\s\S]*set search_path = public, private, pg_temp[\s\S]*as \$\$[\s\S]*return v_updated_at;[\s\S]*end;[\s\S]*\$\$;/,
  );
});
