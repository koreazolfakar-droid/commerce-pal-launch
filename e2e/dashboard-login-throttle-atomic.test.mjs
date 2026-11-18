import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baseSchema = await readFile(
  new URL("../supabase/migrations/20260919064000_dashboard_login_throttle.sql", import.meta.url),
  "utf8",
);
const atomicMigration = await readFile(
  new URL("../supabase/migrations/20261118090000_atomic_dashboard_login_throttle.sql", import.meta.url),
  "utf8",
);
const throttleSource = await readFile(
  new URL("../supabase/functions/dashboard-auth-throttle/index.ts", import.meta.url),
  "utf8",
);

async function isolatedDatabase() {
  const db = new PGlite();
  await db.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
    end $$;
  `);
  await db.exec(baseSchema);
  await db.exec(atomicMigration);
  return db;
}

function bucketKey(index) {
  return index.toString(16).padStart(64, "0");
}

async function attempt(db, pair, ip) {
  const result = await db.query(
    "select public.consume_dashboard_login_attempt($1, $2) as decision",
    [pair, ip],
  );
  const raw = result.rows[0].decision;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

test("atomic login throttle allows five pair attempts then blocks the sixth", async () => {
  const db = await isolatedDatabase();
  try {
    const pair = bucketKey(1001);
    const ip = bucketKey(2001);

    // Promise-based burst: the same pair and IP must never overwrite counters.
    const outcomes = await Promise.all(
      Array.from({ length: 12 }, () => attempt(db, pair, ip)),
    );
    assert.equal(outcomes.filter((item) => item.allowed === true).length, 5);
    assert.equal(outcomes.filter((item) => item.allowed === false).length, 7);
    assert.ok(outcomes.filter((item) => !item.allowed).every((item) => item.retryAfter > 0));

    const { rows } = await db.query(
      "select key_hash, failure_count, blocked_until from public.dashboard_login_throttle where key_hash in ($1, $2)",
      [pair, ip],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows.find((row) => row.key_hash === pair).failure_count, 5);
    assert.equal(rows.find((row) => row.key_hash === ip).failure_count, 5);
    assert.ok(rows.find((row) => row.key_hash === pair).blocked_until);
    assert.equal(rows.find((row) => row.key_hash === ip).blocked_until, null);
  } finally {
    await db.close();
  }
});

test("IP-wide throttle blocks password spraying across many emails", async () => {
  const db = await isolatedDatabase();
  try {
    const ip = bucketKey(3001);
    for (let i = 1; i <= 25; i++) {
      const result = await attempt(db, bucketKey(10000 + i), ip);
      assert.equal(result.allowed, true, `IP attempt ${i} was unexpectedly blocked`);
    }
    const blocked = await attempt(db, bucketKey(20000), ip);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfter > 0);

    const { rows } = await db.query(
      "select failure_count from public.dashboard_login_throttle where key_hash = $1",
      [ip],
    );
    assert.equal(rows[0].failure_count, 25);
  } finally {
    await db.close();
  }
});

test("throttle RPC rejects malformed keys and browser role execution", async () => {
  const db = await isolatedDatabase();
  try {
    await assert.rejects(() => attempt(db, "not-a-hash", bucketKey(100)));
    await assert.rejects(() => attempt(db, bucketKey(9), bucketKey(9)));

    const { rows } = await db.query(`
      select
        has_function_privilege('anon', 'public.consume_dashboard_login_attempt(text,text)', 'EXECUTE') as anon,
        has_function_privilege('authenticated', 'public.consume_dashboard_login_attempt(text,text)', 'EXECUTE') as authenticated,
        has_function_privilege('service_role', 'public.consume_dashboard_login_attempt(text,text)', 'EXECUTE') as service_role
    `);
    assert.equal(rows[0].anon, false);
    assert.equal(rows[0].authenticated, false);
    assert.equal(rows[0].service_role, true);
  } finally {
    await db.close();
  }
});

test("pre-auth throttle does not trust spoofable forwarded IP fallbacks", () => {
  const ipFunction = throttleSource.slice(
    throttleSource.indexOf("function clientIp(req: Request) {"),
    throttleSource.indexOf("async function sha256("),
  );
  assert.match(ipFunction, /req\.headers\.get\("cf-connecting-ip"\)/);
  assert.doesNotMatch(ipFunction, /req\.headers\.get\("x-forwarded-for"\)/);
  assert.doesNotMatch(ipFunction, /req\.headers\.get\("x-real-ip"\)/);
  assert.doesNotMatch(ipFunction, /req\.headers\.get\("true-client-ip"\)/);
  assert.match(ipFunction, /: "unknown"/);
});

test("public pre-auth Edge handler caps streamed request bytes before JSON parsing", () => {
  assert.match(throttleSource, /readBoundedText\(req, 1024\)/);
  assert.match(throttleSource, /error instanceof RequestBodyTooLargeError/);
  assert.match(throttleSource, /payload_too_large.*413/);
  assert.doesNotMatch(throttleSource, /await req\.json\(\)/);
  assert.match(throttleSource, /supabase\.rpc\("consume_dashboard_login_attempt"/);
});
