import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Android CI builds, verifies and runtime-smoke-tests the debug APK", async () => {
  const workflow = await read(".github/workflows/android-ci.yml");
  const smoke = await read(".github/scripts/android-emulator-smoke-test.sh");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /android-actions\/setup-android@v3/);
  assert.match(workflow, /gradle\/actions\/setup-gradle@v4/);
  assert.match(workflow, /gradle-version: "9\.6\.0"/);
  assert.doesNotMatch(workflow, /gradle-version: "9\.4\.0"/);
  assert.match(workflow, /PIPESTATUS\[1\]/);
  assert.match(workflow, /node scripts\/android-security-gate\.mjs/);
  assert.match(workflow, /javac --release 8/);
  assert.match(workflow, /:app:lintDebug :app:assembleDebug/);
  assert.match(workflow, /versionCode='3'/);
  assert.match(workflow, /versionName='1\.0\.2-debug'/);
  assert.match(workflow, /apksigner/);
  assert.match(workflow, /zipalign/);
  assert.match(workflow, /android-emulator-runner@v2/);
  assert.match(workflow, /script: bash \.github\/scripts\/android-emulator-smoke-test\.sh/);
  assert.match(workflow, /Space-Call-1\.0\.2-debug\.apk/);
  assert.match(workflow, /RUNTIME-VALIDATED\.txt/);
  assert.match(workflow, /actions\/upload-artifact@v4/);

  assert.match(smoke, /^#!\/usr\/bin\/env bash/m);
  assert.match(smoke, /set -euo pipefail/);
  assert.match(smoke, /store\.spacecallapp\.app\.debug/);
  assert.match(smoke, /am start -W/);
  assert.match(smoke, /Status: ok/);
  assert.match(smoke, /AndroidRuntime/);
  assert.match(smoke, /RUNTIME-VALIDATED\.txt/);
});
