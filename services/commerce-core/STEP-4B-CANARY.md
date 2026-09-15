# Step 4B — Cloudflare canary deployment

This step deploys the existing Rust Commerce Core as a separate Cloudflare Worker named `space-call-commerce-core-canary`.

Safety rules:

- The storefront is not routed to this Worker in Step 4B.
- The existing Shopify storefront path remains unchanged.
- Deployment requires GitHub Actions secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `SHOPIFY_STOREFRONT_TOKEN`.
- The Shopify token is written only to an ephemeral CI file and uploaded as a Cloudflare Worker secret; the file is removed even if deployment fails.
- The workflow validates Rust formatting, tests, clippy, WebAssembly compilation, and release build before deployment.
- The workflow deploys a distinct canary Worker name so it cannot overwrite the base Worker accidentally.
- After deploy, CI resolves the account workers.dev subdomain, checks `/health`, resolves one live Shopify product handle, and verifies the `product-detail-v1` response contract over the public Worker endpoint.
- A successful Step 4B still does not enable storefront traffic. Routing remains a separate reviewed step.
