import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("closed customer overlays stay out of the initial storefront module graph", async () => {
  const root = await readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");

  assert.match(root, /const CustomerAuthDialog = lazy\(\(\) =>/);
  assert.match(root, /const CustomerAddressHub = lazy\(\(\) =>/);
  assert.match(root, /\{authOpen \? \(/);
  assert.match(root, /\{addressBookOpen \? \(/);
  assert.doesNotMatch(root, /^import \{ CustomerAuthDialog \} from /m);
  assert.doesNotMatch(root, /^import \{ CustomerAddressHub \} from /m);
  assert.match(root, /<CustomerAuthProvider>/);
  assert.match(root, /<CustomerAccountProvider>/);
});
