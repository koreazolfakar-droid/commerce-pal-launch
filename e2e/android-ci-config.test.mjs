import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Android CI builds, verifies and runtime-smoke-tests the debug APK", async () => {
  const workflow = await read(".github/workflows/android-ci.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /android-actions\/setup-android@v3/);
  assert.match(workflow, /gradle\/actions\/setup-gradle@v4/);
  assert.match(workflow, /gradle-version: "9\.4\.0"/);
  assert.match(workflow, /node scripts\/android-security-gate\.mjs/);
  assert.match(workflow, /:app:lintDebug :app:assembleDebug/);
  assert.match(workflow, /store\.spacecallapp\.app\.debug/);
  assert.match(workflow, /apksigner/);
  assert.match(workflow, /android-emulator-runner@v2/);
  assert.match(workflow, /am start -W/);
  assert.match(workflow, /FATAL EXCEPTION/);
  assert.match(workflow, /Space-Call-1\.0\.2-debug\.apk/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
