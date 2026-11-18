# picomatch local security backport — 2026-11-18

## Advisory and scope

The upstream npm registry reports `picomatch@4.0.7` as its newest release while GitHub advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (CVE-2026-112366, HIGH, ReDoS) identifies **all published versions through 4.0.7** as affected, without a patched upstream version as of 2026-11-18.

Our application previously resolved 2.3.2, 4.0.5 and 4.0.7 from transitive dependencies. Rather than suppress the dependency security gate, this branch vendors the unmodified MIT-licensed picomatch 4.0.7 distribution sources except for the documented defensive edit in `vendor/picomatch/lib/parse.js` and the local package metadata, using `package.json` `overrides.picomatch = "file:./vendor/picomatch"` and a regenerated `bun.lock`.

**The version `4.0.8-spacecall.1` is an internal backport identifier. It is NOT an official upstream 4.0.8 release, an npm package release, or an endorsement by the picomatch maintainers.**

## Local mitigation

The parse entrypoint scans glob characters once, before building regexes. Unescaped star wildcards inside repeated `+(...)` or `*(...)` extglobs (including nested forms) are rejected with `SyntaxError`. Extremely deeply nested repeated extglobs (more than 32 frames) are rejected early. This directly addresses the known catastrophic-backtracking examples `+(*)` and `+(*a)` while ordinary simple globs, brace patterns and non-risky extglobs continue to parse. The guard applies even if the caller explicitly disables the upstream `maxExtglobRecursion` protection.

The policy intentionally errs on the side of rejecting some valid repeat patterns containing wildcard stars. Calls with potentially untrusted glob patterns must handle `SyntaxError` or avoid enabling glob patterns for untrusted inputs.

## Verification

- `node --test e2e/picomatch-redos-regression.test.mjs`: accepts common glob patterns, refuses known exploit shapes, checks escaped/class wildcards, rejects nesting depth abuse, asserts all `bun.lock` picomatch resolutions point to the local fork.
- `bun install --frozen-lockfile` must succeed.
- `bun audit --audit-level=high` must report no unremediated HIGH/CRITICAL advisory.
- Full Storefront CI, Security Pentest (Semgrep/Gitleaks/Trivy, isolated attack tests, container restrictions), Dashboard Workflows, Commerce Acceptance and Cloudflare Staging Build must all pass, including SSR and real browser checks.

**Audit caveat:** Bun's advisory result is version/lockfile based and cannot prove the locally edited parser is correct. The dedicated exploit regressions and full ecosystem compatibility suite are mandatory compensating verification. This backport is a temporary mitigation and should be independently reviewed; it cannot establish that all unknown ReDoS variants have been eliminated.

## Upstream exit strategy

Track [issue #518](https://github.com/koreazolfakar-droid/commerce-pal-launch/issues/518). On an official fixed picomatch release:

1. Validate the upstream security notice and actual patched version.
2. Remove the local override and vendored source.
3. Regenerate `bun.lock`, ensure the v2-dependent call paths remain compatible, and re-run all security and UI tests before merging.
4. Do not assume a higher version or an empty `bun audit` output alone proves safety.

The vendor content retains its upstream MIT LICENSE. No production credentials, login records or user data are changed by this dependency patch.
