# Storefront audit implementation plan

Goal: Repair verified catalogue metadata and navigation defects, publish balanced merchant-authorized policies, and verify the current shopping flow.

Architecture: Preserve the existing TanStack/Supabase storefront. Fix metadata at its source; shared helpers prevent placeholder brands and false used-phone matches. Policies remain editable CMS content.

Constraints: Preserve published git history. Do not substitute unrelated product photos. Preserve statutory consumer rights. Never submit a live customer order during QA.

- [x] Add regression tests for placeholder vendors and used-phone false positives; implement shared rules.
- [x] Return used-phone availability with lightweight navigation facets and condition desktop/mobile links.
- [x] Repair the 10 missing brand relationships and 3 missing categories using exact product identities; verify DB results.
- [x] Inspect missing/broken image sources, recover exact existing assets where possible, record unresolved original-photo requirements.
- [x] Publish bilingual shipping, returns and warranty text; connect warranty CMS rendering.
- [x] Run unit checks, typecheck/build, and browser shopping/responsive checks; record limitations and review changes.

Execution evidence and remaining authenticated-order verification limits: `docs/storefront-audit-2026-11-10.md`.
