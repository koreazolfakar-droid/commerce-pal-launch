import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = (name) =>
  readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8");

test("dashboard access requires the current user's live session for either second factor", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema private;
      create schema auth;
      create role authenticated;
      create role anon;
      create role service_role;
      create table auth.users (id uuid primary key);
      create table auth.sessions (id uuid primary key, user_id uuid, not_after timestamptz);
      create table public.user_roles (user_id uuid, role text);
      create function auth.jwt() returns jsonb language sql as $$
        select current_setting('test.claims')::jsonb
      $$;
      create function auth.uid() returns uuid language sql as $$
        select (auth.jwt()->>'sub')::uuid
      $$;
    `);
    await db.exec(await migration("20260919054000_dashboard_totp_mfa_enforcement.sql"));
    await db.exec(await migration("20260920042013_dashboard_password_then_totp_or_passkey.sql"));
    await db.exec(
      await migration("20261127070355_enforce_dashboard_sessions_and_order_ownership.sql"),
    );
    const user = "10000000-0000-4000-8000-000000000001";
    const session = "20000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values ($1)", [user]);
    await db.query("insert into user_roles values ($1, 'editor')", [user]);
    await db.query("insert into auth.sessions values ($1, $2, null)", [session, user]);
    const claims = (aal) =>
      db.query("select set_config('test.claims',$1,false)", [
        JSON.stringify({ sub: user, session_id: session, aal }),
      ]);
    async function access(staff, admin) {
      const result = await db.query(
        "select private.is_dashboard_staff() as staff, private.is_dashboard_admin() as admin",
      );
      assert.deepEqual(result.rows[0], { staff, admin });
    }
    await claims("aal1");
    await access(false, false);
    await claims("aal2");
    await access(true, false);
    await db.exec("update user_roles set role = 'admin'");
    await access(true, true);
    await db.exec("update auth.sessions set not_after = now() - interval '1 second'");
    await access(false, false);
    await claims("aal1");
    await db.query(
      "insert into dashboard_passkey_session_assurance (session_id,user_id,expires_at,passkey_last_used_at) values ($1,$2,now()+interval '1 hour',now())",
      [session, user],
    );
    await access(false, false);
    await db.exec("update auth.sessions set not_after = null");
    await access(true, true);
    await db.exec("delete from auth.sessions");
    await access(false, false);
    await claims("aal2");
    await access(false, false);
  } finally {
    await db.close();
  }
});
