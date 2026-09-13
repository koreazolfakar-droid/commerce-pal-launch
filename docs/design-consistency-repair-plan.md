# Space Call — Design Consistency Repair Plan

## Goal

Build one coherent visual system across desktop, mobile, home, catalog, category, product, utility and footer surfaces without changing Shopify data flow or route behavior.

## Design contract

- Content max width: `80rem` (1280px)
- Mobile gutter: `0.875rem`
- Tablet gutter: `1rem`
- Desktop gutter: `1.5rem`
- Primary card radius: `1.25rem`
- Compact control radius: `0.875rem–1rem`
- Primary touch target: `44px`
- Typeface: Plus Jakarta Sans; Arabic: Cairo
- Brand blue is reserved for interaction; semantic colors are reserved for status
- Light/dark themes share the same elevation hierarchy

## Audit findings

### P0 — structural consistency

1. Multiple late CSS layers override the same selectors with different values, so import order affects the final design.
2. Shell width drifts between `80rem` and `84rem`, causing header/home/catalog/footer edges to misalign.
3. Mobile header/search content is capped at `max-w-md`, causing excessive empty space on tablets.
4. Desktop navigation mixes 12px, 13px and 14px controls in the same row.

### P1 — component consistency

5. Homepage compact product cards and full catalog cards use different radius/action scales beyond their density difference.
6. Legacy `.category-icon-*` CSS remains even though CategorySection now uses the newer icon-first structure.
7. Footer social controls used a smaller/different touch-radius language from header/card controls.
8. Bottom navigation contains legacy hard-coded color values; the canonical consistency layer now overrides the visible surface/active states with semantic tokens, while source-level cleanup remains desirable.
9. Several global selectors depend on Tailwind class-name substrings, which is fragile when component classes change.
10. Cart quantity/remove controls were below the shared 44px primary touch-target standard.

### P2 — polish and maintainability

11. Reduce duplicate shadows/gradients and keep them behind shared tokens.
12. Maintain keyboard focus, reduced motion, RTL and dark mode as acceptance criteria.
13. Verify responsive layouts visually against the Figma reference when MCP access is available again.

## Repair phases

### Phase 1 — Foundation / P0

- [x] Introduce a canonical storefront consistency layer.
- [x] Standardize shell width at 80rem.
- [x] Remove redundant `ux-polish.css` and `ux-welcome.css` runtime imports.
- [x] Make mobile/tablet chrome fluid instead of being visually capped at `max-w-md`.
- [x] Normalize desktop navigation typography/touch heights.

### Phase 2 — Components / P1

- [ ] Normalize product-card radius, media stage, wishlist/cart control sizing and vertical rhythm.
- [ ] Remove stale category CSS from the old category-card implementation.
- [x] Align footer social controls with the shared 44px touch/radius language.
- [x] Raise cart quantity/remove controls to the shared 44px touch-target standard.
- [x] Token-align the rendered BottomNav surface and active-state colors.
- [ ] Replace fragile class-substring styling with semantic hooks where practical.

### Phase 3 — Verification / P2

- [ ] Check 360px, 390px, 768px, 1024px and 1440px layouts.
- [ ] Verify English + Arabic (RTL).
- [ ] Verify light + dark themes.
- [ ] Verify focus-visible and reduced-motion behavior.
- [ ] Re-run build/CI checks when available.
- [ ] Compare against the Space Call Figma reference once the Figma MCP Starter-plan rate limit resets.

## Current execution status

Phase 1 is applied on `main`. Phase 2 is partially applied. GitHub currently exposes no CI/status workflow for these commits, so final visual/build verification must be done through the deployment or a local build runner. Figma MCP is connected but currently rate-limited on the Starter plan, so no fresh Figma screenshot audit was possible during this pass.

## Acceptance criteria

- Header, hero, sections, catalog and footer align to one horizontal grid.
- No tablet dead-space caused by mobile-only width caps.
- No competing CSS layers for core layout primitives.
- Primary tap targets remain at least 44px.
- No Shopify, route or data behavior changes from visual cleanup.
