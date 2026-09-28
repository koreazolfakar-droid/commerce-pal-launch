import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const migrationNames = (await readdir(migrationsUrl))
  .filter((name) => name.endsWith(".sql"))
  .sort();

test("Supabase migrations do not contain malformed single-dollar function delimiters", async () => {
  for (const name of migrationNames) {
    const source = await readFile(new URL(name, migrationsUrl), "utf8");
    assert.doesNotMatch(
      source,
      /\bas\s+\$(?:\s|\n)|\n\$;(?=\s|$)/i,
      `${name} contains a malformed single-dollar function body delimiter`,
    );
  }
});

test("Supabase dollar-quote tags are balanced per migration", async () => {
  for (const name of migrationNames) {
    const source = await readFile(new URL(name, migrationsUrl), "utf8");
    const counts = new Map();
    for (const match of source.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)?\$/g)) {
      const tag = match[0];
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    for (const [tag, count] of counts) {
      assert.equal(
        count % 2,
        0,
        `${name} has an unbalanced ${tag} dollar-quote delimiter (${count} occurrence(s))`,
      );
    }
  }
});
