import { readFile } from "node:fs/promises";
import {
  checkAnalyticsRelease,
  publicSupabaseDefaults,
  resolveAnalyticsReleaseConfig,
} from "./lib/analytics-release.mjs";

try {
  const source = await readFile(
    new URL("../src/integrations/supabase/client.ts", import.meta.url),
    "utf8",
  );
  const config = resolveAnalyticsReleaseConfig(process.env, publicSupabaseDefaults(source));
  const result = await checkAnalyticsRelease(config);
  for (const check of result.checks)
    console.log(`[analytics-release] ${check.rpc}: ${check.status}`);
  if (!result.ready) {
    console.error(
      "[analytics-release] Deployment blocked. Verify the Analytics migration, public key and API reachability. Do not grant anonymous access to fix this check.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "[analytics-release] RPC signatures exist and anonymous execution is denied. Authenticated behavior remains covered by database and browser tests.",
    );
  }
} catch {
  // Never print connection configuration, credentials, raw responses or transport errors.
  console.error(
    "[analytics-release] Deployment blocked: invalid public connection configuration or missing browser defaults.",
  );
  process.exitCode = 1;
}
