import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260920063000_dashboard_inventory_server_pagination.sql", import.meta.url),
  "utf8",
);
const mfaHardening = await readFile(
  new URL("../supabase/migrations/20260924010038_enforce_inventory_rpc_mfa.sql", import.meta.url),
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

test("inventory RPCs require the dashboard MFA/passkey authorization boundary", () => {
  const checks = mfaHardening.match(/private\.is_dashboard_staff\(\)/g) ?? [];
  assert.equal(checks.length, 2);
  assert.match(mfaHardening, /auth\.uid\(\) is null/);
  assert.doesNotMatch(
    mfaHardening,
    /from public\.user_roles ur[\s\S]{0,160}role::text in \('admin', 'editor'\)/,
  );
  assert.match(
    mfaHardening,
    /dashboard_inventory_page\([^)]+\) from public, anon;/,
  );
  assert.match(
    mfaHardening,
    /dashboard_inventory_summary\(integer\) from public, anon;/,
  );
  assert.match(mfaHardening, /to authenticated, service_role;/);
});
