import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const updateMigration = await readFile(
  new URL("../supabase/migrations/20260920053510_fix_update_hero_v3_composite_row_assignment.sql", import.meta.url),
  "utf8",
);
const createMigration = await readFile(
  new URL("../supabase/migrations/20260920053539_fix_create_hero_v3_composite_row_assignment.sql", import.meta.url),
  "utf8",
);
const migrations = `${updateMigration}\n${createMigration}`;

test("hero v3 wrappers expand composite RPC results before assigning rowtype", () => {
  assert.match(
    createMigration,
    /select\s+\*\s+into\s+v_slide\s+from\s+public\.create_cms_hero_slide_v2\s*\(/i,
  );
  assert.match(
    updateMigration,
    /select\s+\*\s+into\s+v_slide\s+from\s+public\.update_cms_hero_slide_v2\s*\(/i,
  );

  const visualAssignments = migrations.match(
    /select\s+\*\s+into\s+v_slide\s+from\s+public\.set_cms_hero_visual_config\s*\(/gi,
  ) ?? [];
  assert.equal(visualAssignments.length, 2);

  assert.doesNotMatch(
    migrations,
    /select\s+public\.(?:create_cms_hero_slide_v2|update_cms_hero_slide_v2|set_cms_hero_visual_config)\([^;]+\)\s+into\s+v_slide/gi,
  );
});
