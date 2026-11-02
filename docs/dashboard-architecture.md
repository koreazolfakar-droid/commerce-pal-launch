# Space Call Dashboard architecture

This document describes the current Dashboard structure and the incremental
direction for future features. It is not an invitation to rewrite production
features or bypass database rules.

## Runtime boundaries

- `AppMount.tsx` remains the lazy application entry point.
- `App.tsx` owns the app providers, the Supabase/MFA session gate, and the
  composition of the Dashboard shell and route outlet. Avoid adding business
  features or large JSX blocks here.
- `components/layout/DashboardSidebar.tsx` owns sidebar navigation,
  permissions-based visibility, and menu state.
- `components/layout/DashboardHeader.tsx` owns account actions, language/theme
  controls, and command center placement.
- `components/layout/DashboardMobileNav.tsx` owns the five mobile actions and
  route preloading.
- `components/layout/DashboardRouteFallback.tsx` owns the lazy-route loading UI.
- `config/routes.tsx` is the single registry for Dashboard URLs, lazy page
  imports, navigation metadata, aliases, and preloading. Do not duplicate
  route definitions in new components.
- `pages/` contains route-level orchestration, not reusable visual primitives.
- `components/` contains UI, with `components/products/`, `/orders/`,
  `/brands/` and `/categories/` for domain-specific composition.
- `data/` owns Supabase reads/writes and the existing authorization and
  integrity rules; UI should use existing data APIs rather than direct
  database writes.
- `hooks/` owns reusable React state/effect behavior; `lib/` should contain
  pure validation, formatting, and mapping wherever possible.
- `i18n.ts` and `uiTranslations.ts` remain the source of localized strings.
  Keep English/Arabic behavior and right-to-left support intact.

## Adding a Dashboard feature

1. Define the feature's user journey, permissions, read/write operations, and
   necessary database constraints. Prefer reuse over new infrastructure.
2. Put route-level UI in `pages/`, shared domain UI in
   `components/<domain>/`, and non-React transformations in `lib/`.
   Avoid importing page modules from other pages.
3. Put database operations in the relevant `data/` module. Preserve RLS,
   session checks, stock correctness, audit events, and error handling.
4. Register new URLs in `config/routes.tsx` using lazy imports; add navigation
   metadata there instead of manually editing Sidebar or Header.
5. Add tests under `e2e/` for route resolution, permissions, validation,
   browser behavior on desktop/mobile, and RTL. Static shell tests can use
   `e2e/helpers/dashboard-shell-source.mjs` to inspect the whole shell.
6. Run `bun run typecheck`, `bun run lint`, `bun run test:unit`,
   `bun run build`, and relevant browser/commerce workflows. Use a small
   reviewable PR, and merge only when checks pass.

## Incremental migration priorities

The shell is now physically separated from the session gate. The largest
remaining feature-oriented modules include `pages/ProductFormPage.tsx`,
`pages/ReceivingPage.tsx`, `pages/HomepageBuilder.tsx`, and
`data/catalog.ts`. Break these apart by **business capability**, using a
dedicated follow-up PR with behavior tests for each change. Do not move all
files in one PR or remove features solely to reduce line counts.

## Compatibility requirements

Preserve product editor state and autosave, AI research, authentication
(including Auth0 and Supabase MFA), route URLs, dashboard list context,
responsive/RTL navigation, lazy preloading, storefront SSR/SEO, order and
procurement workflows, inventory mutations, storage images, and RLS.
An architectural refactor must not silently change public APIs or database
migrations.
