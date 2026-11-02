# Product editor repair implementation plan

**Goal:** Repair the existing Add/Edit Product editor and AI review flow, implement compatible catalog gaps, and deliver only verified changes.

**Architecture:** Retain the stock-aware product RPC, independent media/variant managers, public catalog gateway, and scoped dashboard design system. Add optional organization data through an atomic caller-authorized wrapper; do not change inventory accounting or publish AI results.

**Spec:** User's complete Add Product repair brief, 2026-11-02. Upstream base: `78520d32318f673eba007e45c82ee1329473550a`.

## Constraints and review focus

- Preserve PR #473's portal flex layout; no global layout overrides.
- Preserve staff/RLS checks, compare-at validation, stock snapshots and ledger writes.
- Save responses must not erase edits made while requests are pending.
- Failed uploads must remain recoverable without duplicate products or media.
- Test fixtures must not send synthetic credentials or product writes to production.
- Cost is weighted accounting data; do not add an unrestricted cost editor.
- Required CI, browser, build and backend evidence gate merge; report any blocker.

## Execution

- [ ] Audit all sections, field/database mappings, recent PRs, baseline unit/browser results and screenshots.
- [ ] Write failing save reconciliation and expanded browser geometry/interaction tests. Repair verified races and layout defects.
- [ ] Compare official Shopify documentation; implement compatible organization/translation fields, SEO preview and media accessibility with real persistence.
- [ ] Test safe migrations against isolated PostgreSQL and preserve authorization and inventory behavior.
- [ ] Run typecheck, lint, full unit/regression suites, browser matrix, production build and SSR checks.
- [ ] Review diff, publish a PR, merge only after required verification passes; independently verify deployment status.

## Execution ledger

- Source downloaded through authorized GitHub connector because direct Git clone lacks credentials. Local Git is a verification snapshot; remote branch starts at the real upstream commit. Never push local snapshot history.
- Read-only production schema inspection confirms existing tags, product_type, title_ar, description_ar and weighted average_cost columns. No production product data changed.
- Baseline browser run initially blocked by missing Playwright browser; installing its matching Chromium.
