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
- dedicated Rust CI

No storefront, checkout, order, inventory, auth, RLS, or dashboard behavior is moved to Rust yet.

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

## Next step

After this foundation passes CI and receives a deployment secret, the next backend milestone is Supabase JWT verification and a protected `GET /api/me` endpoint. Order and inventory writes remain on the existing path until authentication and authorization are proven end-to-end.
