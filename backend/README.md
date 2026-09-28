# Space Call API — phase 1

This is an independent Axum service. The intended future data path is **frontend → Rust API → Supabase PostgreSQL**. No frontend calls this service yet. Existing storefront, dashboard, Supabase Auth, RLS, checkout, inventory, images, and deployment routing remain in place.

## Local setup

Install stable Rust (with rustfmt and Clippy) and make a local copy of the example environment:

```sh
cd backend
cp .env.example .env
# Edit .env with your own development PostgreSQL/Supabase values.
cargo run
```

Use a **dedicated, least-privilege database role** with read-only access for phase 1 (enough to run `SELECT 1`). Do not use the Supabase `postgres` owner or a service-role credential. Connecting to PostgreSQL directly does not automatically carry a customer JWT; future user-level queries must explicitly preserve RLS and authorization. For a Supabase direct connection use its supplied TLS-enabled PostgreSQL URL; use its pooler URL when appropriate for the hosting environment. The example is a placeholder, not a usable connection string.

Required environment variables:

| Variable | Meaning |
| --- | --- |
| `APP_ENV` | `development` or `production` |
| `HOST` | Bind IP address; use `127.0.0.1` locally. Use a private network/interface behind a TLS proxy for production. |
| `PORT` | Nonzero TCP port |
| `DATABASE_URL` | PostgreSQL connection URL with TLS (`sslmode=require` or stronger for remote Supabase); never log or commit it |
| `DATABASE_MAX_CONNECTIONS` | Optional, 1–20; defaults to 5; budget across all replicas |
| `SUPABASE_URL` | HTTPS project URL, reserved for phase 2 JWT verification |
| `SUPABASE_ANON_KEY` | Public anon/publishable key, reserved for phase 2; **never use a service-role key here** |
| `ALLOWED_ORIGINS` | Comma-separated exact origins (scheme, host and optional port); no wildcard, paths or credentials. Production: `https://spacecallapp.store,https://www.spacecallapp.store`. Local HTTP is allowed only on localhost/loopback in development. Native TWA requests use the website origin. |
| `RUST_LOG` | Explicit tracing filter, for example `info,sqlx=warn` |

Production fails at startup on missing/invalid configuration or database connectivity failure. The service never falls back to a disconnected mode. Keep `.env` out of git; set production environment through the host secret manager.

## Health and lifecycle

`GET /health` checks PostgreSQL on each request (five-second upper bound). A healthy result is HTTP 200:

```json
{"status":"ok","service":"space-call-api","database":"healthy"}
```

When the database is unavailable after startup, it returns HTTP 503:

```json
{"status":"degraded","service":"space-call-api","database":"unhealthy"}
```

Other unmatched routes return HTTP 404 with `{"error":{"code":"NOT_FOUND","message":"Route not found"}}`. Responses disclose no SQL, credentials or server paths. Request logs include method, matched route, status, latency and generated `x-request-id`. Keep server logs access-controlled. SIGTERM/Ctrl-C stops accepting requests and closes the pool after the server finishes draining. Configure a process supervisor and reverse proxy for TLS, restart and deployment; this phase does not change the website's routing.

## Checks

From `backend/`:

```sh
cargo fmt --check
cargo check --locked
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo run --locked
```

No schema migrations, write queries, admin endpoints, or authenticated routes exist in phase 1. Phase 2 is **Supabase JWT verification + authenticated `/api/me`**, including correct RLS identity propagation. Do not send traffic to the API until that phase is implemented and verified.
