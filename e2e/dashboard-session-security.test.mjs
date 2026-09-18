import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");

test("dashboard expires inactive Supabase sessions", () => {
  assert.match(app, /30 \* 60 \* 1000/);
  assert.match(app, /signOutDashboard\(\)/);
  assert.match(app, /pointerdown/);
  assert.match(app, /keydown/);
  assert.match(app, /touchstart/);
  assert.match(app, /Dashboard session expired after 30 minutes of inactivity/);
});
