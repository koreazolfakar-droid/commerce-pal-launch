# Lovable Independence Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement and verify each task.

**Goal:** Develop, build and run Space Call without Lovable while preserving existing features.
**Architecture:** Direct Vite/TanStack/Nitro plugins for local CI; existing Cloudflare Vite build
for production; direct Gemini in the existing Supabase AI function.
**Tech Stack:** React 19, TanStack Start, TypeScript, Bun, Cloudflare Workers, Supabase.

## Constraints and review focus

- Preserve storefront, Dashboard, SSR, auth, business data and security guards.
- Keep exact production domains, disabled public previews and existing server secrets.
- Never add payment methods or change production database records.
- Preserve tab-session migration and memory fallback; never send tokens to embedder windows.
- Keep AI research grounding, schema/evidence validation and manual approval.
- Registrar transfer needs a separate secure EPP handover, 60-day eligibility and payment.

## Tasks

- [x] Audit code, dependency URLs, current hosting and direct Gemini configuration.
- [x] Write failing dependency/config and embedded-session tests.
- [x] Replace build wrapper, prune unused dependencies, use public tarballs with same integrity.
- [x] Remove editor auth/telemetry hooks; preserve production session behavior.
- [x] Remove unused Lovable AI provider; retain direct Gemini and ungrounded retry.
- [x] Run focused local regressions and frozen dependency installation.
- [ ] Pass complete GitHub CI and independent code review before merge.
- [ ] Confirm final Cloudflare deployment, deploy matching AI function and verify read-only.
- [ ] Complete registrar and Lovable account handover when eligibility and payment allow it.
