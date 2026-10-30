# Device and inventory data entry fixes

This change improves the existing device/inventory workflow. It is not an assertion that every administration feature has been audited or implemented.

- Inventory quantities are drafts until an explicit Save/Enter and confirmation. Empty values cannot write zero; an explicit zero remains valid. The confirmation shows the old/new quantity and requires an adjustment reason. Cancel discards the staged change.
- Plus/minus controls stage adjustments for the same review, rather than issuing immediate writes. Conflicts retain the draft. Review latest stock fetches the target independently of the current filter/page, updates the expected snapshot only after the user's action, and requires another confirmation.
- Variant metadata-only updates preserve the server's current stock. Explicit stock changes compare the original quantity under the row lock before calling the existing transactional update. Existing invoker permissions and staff/MFA checks remain. The new guarded RPC was applied to the production schema; no production business rows were used for testing.
- Product editor variant snapshots preserve locally changed scalar fields. Category changes, including AI-suggested changes, show the specification keys that would be removed and require the shared dashboard confirmation dialog.
- Specification search, completion counts and missing-only filtering retain all underlying values. A focused field stays visible while being filled. AI review rules and protection of existing values are retained.
- Device records link to stock management. New confirmation/recovery labels support Arabic.

Verification: full unit suite, embedded PostgreSQL execution of the real guarded RPC, TypeScript, lint, security gates, production build and existing dashboard browser suites. `e2e/dashboard-data-entry-browser.mjs` exercises explicit saving, empty/zero quantities, reasons and specification filtering with synthetic UI fixtures. UI fixtures do not replace live business acceptance; new SQL tests use isolated PostgreSQL. No claim is made for IMEI tracking, bulk imports, accounting, or all dashboard settings.
