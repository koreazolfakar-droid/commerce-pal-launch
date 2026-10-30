# Inventory and device data entry implementation plan

> Execution: native implementation in this session, following the user's instruction to fix the administration/data-entry workflow directly.

Goal: predictable device editing and explicit stock writes with protected concurrent inventory.
Architecture: retain current React screens, Supabase invoker RPCs and access checks. Extend existing controls rather than duplicate pages.
Spec: ../specs/2026-10-30-inventory-device-workflow-design.md

Constraints: no business-record test writes in production; preserve handles, staff/MFA checks, AI review and optional draft fields.
Review focus: blank stock must not become zero; concurrent sales must survive metadata saves; stale adjustments must fail; specification filtering must preserve hidden values; local edits must survive background variant snapshots.

- [ ] Test existing stock callbacks with blank/zero inputs and local unsaved fields; reproduce failures.
- [ ] Make inventory quantity saves explicit, retain invalid drafts, and block conflicting actions.
- [ ] Add a guarded variant update RPC and client snapshot contract; execute real SQL tests for metadata-only saves and stale stock adjustments.
- [ ] Preserve locally edited scalar fields when variant snapshots arrive.
- [ ] Add specification search, incomplete-only filtering, completion counts and localized accessible controls; retain all underlying values.
- [ ] Add category-change loss confirmation and a stock-management link from device editing.
- [ ] Run full unit suite, typecheck, lint, production build and browser workflows; review diff, commit and create PR with verification limits.
