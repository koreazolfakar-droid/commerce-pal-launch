# Space Call Dashboard AI — Cloudflare Workers AI (Free)

## Scope

This is an **opt-in** alternative provider for the existing
`dashboard-ai-assist` Supabase Edge Function. It reuses Dashboard staff
authorization, MFA/step-up enforcement, field allowlists, product variant
matching, confidence calibration, GTIN checks, and the explicit human
approval workflow. No frontend API token is introduced; no storefront
or DNS configuration is changed.

The default Cloudflare model is
`@cf/zai-org/glm-4.7-flash`. An additional explicitly allowed free-plan
model is `@cf/google/gemma-4-26b-a4b-it`. The server refuses every
other model (including paid-only models), even when set via an env var.

Cloudflare's Workers AI Free tier includes **10,000 Neurons per day**,
resetting at 00:00 UTC, subject to platform limits and availability.
Supabase's free tier has its own limits. No paid usage is necessary and
this implementation does not enable paid plans or overages.

## Activation (required, private server-only configuration)

1. In Cloudflare, create a scoped **API token** with **Account → Workers AI → Read**
   permission for the Space Call account. Do not put it in GitHub, frontend env,
   chat messages, or public files.
2. In **Supabase → Project Settings → Edge Functions → Secrets** configure:
   - `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.
   - `CLOUDFLARE_WORKERS_AI_TOKEN`: the private scoped token.
   - `DASHBOARD_AI_PROVIDER`: `cloudflare`.
   - Optional `CLOUDFLARE_AI_MODEL`: `@cf/zai-org/glm-4.7-flash`
     (or `@cf/google/gemma-4-26b-a4b-it`).
3. Deploy **only** `dashboard-ai-assist` from the tested repository revision,
   preserving `verify_jwt = true`.
4. Test a simple product title/description, a reference-text specification,
   an unsupported barcode, and an exhausted quota. Review suggested values
   before applying. If verification fails, keep the previous deployment.
5. To roll back without deleting anything, set
   `DASHBOARD_AI_PROVIDER=gemini` or restore the previous Edge Function
   deployment. Gemini is *not* used silently when Cloudflare fails.

The API client requests Cloudflare's Workers AI
`/ai/run/@cf/...` endpoint from Supabase server-side only, with
`chat_template_kwargs.enable_thinking=false` so long reasoning does not
consume the dashboard request deadline. The upstream inference timeout
is 65 seconds (the dashboard client allows 90 seconds).
The model setting is strictly allowlisted, and the API token is never
returned to the browser. An invalid or missing Cloudflare setup produces
a clear service configuration error.

## Intentional limitations

Unlike the Gemini provider, Cloudflare GLM does **not** automatically get
Google Search or URL Context tools. Passing a product URL alone **does
not mean the model visited the page**. The provider warns that live web
verification is unavailable and sets all model suggestions to
`verified=false`. Unsupported specification fields are blocked; literal
specifications in user-provided source text require review. Descriptions
and SEO text can still be drafted from known information.

To restore independent research, integrate a separate **permissioned,
rate-limited search/retrieval** provider later and keep provenance per
field. Do not claim an unverified source is grounded.

Cloudflare free-tier exhaustion produces a 429 response with an
explanation; the server never falls back to a paid or Gemini provider
behind the user's back. An upstream timeout produces a 504 response with a\nretry-fewer-fields hint, rather than misleadingly blaming API credentials.\nAvoid repeated automatic retries on quota errors.

## Verification

Run `node --test e2e/dashboard-ai-cloudflare.test.mjs
e2e/dashboard-ai-assist.test.mjs
e2e/dashboard-ai-form-fill.test.mjs` and existing project checks.
Verify actual network access on the Cloudflare Free plan before enabling
production routing.

References:
- https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
