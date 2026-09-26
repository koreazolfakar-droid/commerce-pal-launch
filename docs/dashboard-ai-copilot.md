# Space Call AI Admin Copilot

## Phase 1 scope

The first production-safe phase connects one reusable AI assistant to:

- Products
- Categories
- Brands

The assistant supports:

- Research & Fill
- SEO improvement
- Validation
- per-field confidence
- Verified / Review state
- source links when Google Search grounding succeeds
- preview and explicit Apply Selected before the normal form save
- unchanged suggestions shown as No change and blocked from application
- field-specific confidence instead of flattening ungrounded suggestions to one repeated score

Research and SEO actions never mutate the form by themselves. Apply Selected changes local draft fields only, and the AI never persists form changes directly.

## Architecture

```text
Dashboard form
  -> authenticated Supabase client
  -> dashboard-ai-assist Edge Function
  -> staff role check
  -> entity/field allowlist
  -> Gemini Interactions API
  -> structured response normalization
  -> preview in Dashboard
  -> user selects suggestions
  -> existing form save flow
```

The existing Product, Category and Brand save functions remain the only paths that persist catalog changes.

## Gemini configuration

Production requires a server-side Supabase Edge Function secret:

```text
GEMINI_API_KEY=<secret>
```

Optional:

```text
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never expose the Gemini key through a `VITE_*` variable or browser code.

The Edge Function uses the Gemini Interactions API with structured JSON output and defaults to Gemini 3.5 Flash-Lite. It attempts Google Search grounding first. If Search grounding is unavailable for the current API project/tier or quota, it retries without Search and forces the result into an unverified/manual-review state.

As of September 2026, Gemini API Free Tier access depends on the selected model/project. Search grounding also has separate tier/quota rules, so the implementation never assumes Search is available: a 400/403/429 Search failure falls back to ungrounded manual-review output. Verify current model and grounding limits before enabling billing:

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/google-search
- https://ai.google.dev/gemini-api/docs/interactions-overview

## Data sent to Gemini in Phase 1

Only server-allowlisted catalog data can be included.

### Product

- title
- description
- brand name
- category name
- barcode / GTIN
- SEO title
- SEO description
- the names/slugs of available brands and categories

### Category

- name
- slug
- description
- icon
- SEO title
- SEO description
- existing category names/slugs
- allowed icon names

### Brand

- name
- slug
- description
- official website
- SEO title
- SEO description
- existing brand names/slugs

The Edge Function rejects fields outside these entity-specific allowlists even if a modified browser client sends them.

## Protected data

Phase 1 intentionally blocks AI control of operational or sensitive fields, including:

- selling price
- compare-at price
- cost
- stock / inventory quantity
- suppliers
- order status
- refunds
- discounts
- permissions / roles
- passwords
- user IDs

Orders, customers and other personal/customer data are not part of the Phase 1 AI entity allowlist.

## Research trust rules

The prompt and response normalizer enforce these rules:

1. Accuracy is more important than completeness.
2. Prefer manufacturer/brand primary sources, then official documentation, then reputable retailers.
3. Do not invent product specifications, compatibility, identifiers, websites, warranty, stock or commercial values.
4. If the exact model cannot be identified or sources disagree, lower confidence and require review.
5. `verified=true` is accepted only when a grounded Search response also contains real HTTP(S) citation sources.
6. Ungrounded results cannot be shown as Verified. Their model confidence is conservatively scaled to a maximum of 65% while preserving field-to-field differences.
7. Suggestions identical to the current field value are treated as No change and cannot be applied.

## Failure behavior

Gemini is an enhancement, not a dependency.

- If Gemini is not configured, the existing Dashboard forms continue to work.
- If Search grounding is unavailable, the assistant can still produce unverified SEO/copy suggestions.
- If Gemini times out or fails, no catalog mutation occurs.
- Closing the AI drawer discards its preview result.
- Running Research & Fill, Improve SEO or Validate only prepares a preview; it does not mutate form fields.
- Apply Selected changes local form state only after client-side safety checks; the user must still use the existing Save action.

## Next phases

Once Phase 1 is validated in production, extend the same schema/preview system rather than creating separate AI implementations:

1. Media, Hero/Banners and CMS/SEO.
2. Inventory, Receiving and Purchase Orders — advisory/validation only for quantities.
3. Orders, Customers and Sales — with stricter privacy rules and no Free Tier processing of personal customer data.
4. Search aliases, internal linking and catalog-wide SEO audits.
5. Optional request caching, quotas and durable AI audit telemetry.
