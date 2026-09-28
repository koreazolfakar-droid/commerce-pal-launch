# Space Call Rust Backend

This directory is the isolated foundation for the Space Call server-side API.

## Current scope

Only infrastructure is included in this first step:

- Axum HTTP server
- Tokio async runtime
- SQLx PostgreSQL pool
- encrypted Supabase/Postgres connection requirement
- structured tracing
- graceful shutdown
- liveness endpoint: `GET /health`
- readiness endpoint with a real database probe: `GET /ready`
- panic-to-500 middleware
- protected identity endpoint: `GET /api/me`
- Supabase access-token verification through the Auth server

No storefront, checkout, order, inventory, RLS, or dashboard behavior is moved to Rust yet. The new auth endpoint only verifies an existing Supabase session; it does not replace the current frontend authentication flow.

## Database connection

Set `DATABASE_URL` only in the server environment. Never expose it to browser code and never commit it.

For Supabase:

- Persistent backend with IPv6: use the Direct connection string.
- Persistent IPv4-only backend: use the Session pooler connection string.
- Keep TLS enabled. The service refuses a URL unless it explicitly contains `sslmode=require`, `sslmode=verify-ca`, or `sslmode=verify-full`.
- Prefer `verify-full` once the Supabase database CA is configured in the deployment environment.

Copy the exact connection string from Supabase Dashboard -> Connect. Do not construct a pooler hostname manually.

## Local run

```bash
cd backend
cp .env.example .env
# Export the values from .env using your local secret manager or shell.
cargo run
```

The service intentionally does not load `.env` itself. Production and local secrets should be injected by the environment or secret manager.

## Health contracts

`GET /health` is a liveness check and does not touch PostgreSQL.

`GET /ready` runs `SELECT 1` through the configured pool. It returns HTTP 503 if PostgreSQL is unavailable and does not expose database error details in the response.

## Authentication contract

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the server environment. The publishable key is public project configuration; never substitute a `service_role` or `sb_secret` key.

`GET /api/me` requires `Authorization: Bearer <access-token>`. The backend forwards the access token to Supabase Auth `/auth/v1/user` with the publishable API key. A valid session returns the authenticated user's id and basic identity fields. Invalid or missing credentials return HTTP 401; an upstream Auth outage returns HTTP 503 without leaking upstream details.

This deliberately avoids copying the legacy JWT shared secret into the Rust service. When the project uses asymmetric signing keys end-to-end, local JWKS verification can replace the network verification path with a short bounded key cache.

## Next step

Verify `/api/me` end-to-end against a real signed-in Space Call session in the deployment environment. Only after that should a first read-only business endpoint move behind Rust. Order and inventory writes remain on the existing path until authentication and authorization are proven end-to-end.
