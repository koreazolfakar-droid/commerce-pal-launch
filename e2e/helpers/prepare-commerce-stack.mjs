import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";

export const stackDir = resolve(
  process.env.SPACE_CALL_TEST_STACK_DIR || join(tmpdir(), "space-call-commerce-test"),
);
export const root = fileURLToPath(new URL("../../", import.meta.url));
if (stackDir === resolve(root))
  throw new Error("Use a separate temporary directory for the test stack");
const cli = (args) =>
  execFileSync("npx", ["--yes", "supabase@2.121.0", ...args, "--workdir", stackDir], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });

if (process.argv.includes("--stop")) {
  cli(["stop", "--no-backup"]);
} else {
  mkdirSync(stackDir, { recursive: true, mode: 0o700 });
  cli(["init", "--force"]);
  const configPath = join(stackDir, "supabase/config.toml");
  writeFileSync(
    configPath,
    readFileSync(configPath, "utf8").replace(
      "[auth.mfa.totp]\nenroll_enabled = false\nverify_enabled = false",
      "[auth.mfa.totp]\nenroll_enabled = true\nverify_enabled = true",
    ),
  );
  const migrationDir = join(stackDir, "supabase/migrations");
  rmSync(migrationDir, { recursive: true, force: true });
  mkdirSync(migrationDir);
  const originals = readdirSync(join(root, "supabase/migrations")).filter((name) =>
    name.endsWith(".sql"),
  );
  const fixtures = {
    "20260914030000_test_only_cms_baseline.sql": "e2e/fixtures/legacy-cms-baseline.sql",
    "20260921111900_test_only_taxonomy.sql": "e2e/fixtures/local-canonical-categories.sql",
    // The security migration revokes this function before its repository
    // definition. Bootstrap the real, idempotent definition, never a mock.
    "20260927090000_test_specification_prerequisite.sql":
      "supabase/migrations/20260928060000_product_specifications_end_to_end.sql",
  };
  const files = [...originals, ...Object.keys(fixtures)].sort();
  // Two historical files share a version. Use unique local versions, keeping
  // every source SQL file unchanged and in its original chronological order.
  files.forEach((name, index) => {
    const source = fixtures[name]
      ? join(root, fixtures[name])
      : join(root, "supabase/migrations", name);
    // Production applied these scripts transactionally; LOCK TABLE in the
    // ledger reconciliation needs the same boundary in a fresh CLI database.
    writeFileSync(
      join(
        migrationDir,
        `${String(index + 1).padStart(14, "0")}_${name.replace(/\.sql$/, "")}.sql`,
      ),
      `begin;\n${readFileSync(source, "utf8")}\ncommit;\n`,
    );
  });
  console.log("Starting isolated Supabase with repository migrations and TOTP enabled…");
  cli([
    "start",
    ...(process.env.SPACE_CALL_IGNORE_CONTAINER_HEALTHCHECK === "1"
      ? ["--ignore-health-check"]
      : []),
    "--exclude",
    "realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
  ]);
  const status = JSON.parse(cli(["status", "--output", "json"]));
  let authReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      authReady = (
        await fetch(`${status.API_URL}/auth/v1/health`, { headers: { apikey: status.ANON_KEY } })
      ).ok;
    } catch {
      /* starting */
    }
    if (authReady) break;
    await pause(500);
  }
  if (!authReady) throw new Error("Local Auth API failed its real HTTP health check");
  writeFileSync(join(stackDir, "status.json"), JSON.stringify(status), {
    mode: 0o600,
  });
  console.log("Local Supabase ready. Credentials remain in the temporary test directory.");
}
