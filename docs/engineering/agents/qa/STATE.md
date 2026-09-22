# QA state

- Last reviewed SHA: `7cf660ad`
- Last reviewed at: 2026-09-10
- Active task: none (QA-001 and QA-002 completed)
- Confidence: high for static inventory and local runner evidence; hosted CI, branch protection, and live Supabase behavior remain unverified

## Durable facts

- Mission: Own test strategy, fixtures, end-to-end journeys, regression evidence, and quality gates.
- Default working set is recorded in `WORKING_SET.json`.
- QA command aliases referenced by the account matrix and artist-store checklist are present in `package.json` (GAP-019 resolved during QA-001).

### Test infrastructure (verified 2026-09-10)

| Asset | Status |
|-------|--------|
| Vitest | Primary runner, `vitest.config.ts`. QA-002 final: 4891 passed, 0 failed, 8 env-gated skips (512 files, 1881 suites). |
| Jest | Secondary runner, `jest.config.cjs`. 617/617 green (WS-1.6 confirmed). |
| Playwright | E2E runner, `playwright.config.ts`. 5 specs in `tests/e2e/`. Existing journeys are primarily navigation/contract checks; no complete money transaction assertions. |
| Verification tiers | `scripts/verify.mjs` — fast / feature / release. |
| QA scripts | 12 scripts in `scripts/qa/` — multi-persona seeds, flow cast, interaction audit. |
| CI workflows | Present. QA-002 did not evaluate remote workflow status; this local readiness pass records only local command evidence. |

### Critical gaps (priority order)

| Gap | Status |
|-----|--------|
| GAP-001: CI pipeline (e2e.yml) | INCOMPLETE — 16 workflows exist; hosted green status and full gate coverage are unverified locally. |
| GAP-002: E2E money-flow journey | INCOMPLETE — navigate-only, no transaction asserts |
| GAP-003: e2e.yml as required check | INCOMPLETE — workflow exists; repository-level required-check enforcement is unverified. |
| GAP-004: XSS E2E test | MISSING — no payload test in `tests/e2e/` |
| GAP-005: Vitest failures | RESOLVED — full suite green (4891 passed / 0 failed / 8 intentional skips); evidence in completed QA-002. |
| GAP-006: Forged-cookie route regression | INCOMPLETE — only generic helpers tested, not 9+ consumer routes |
| GAP-007: Non-member invite integration test | INCOMPLETE — current test mocks Supabase, doesn't hit real DB |
| GAP-008: Ticket transfer regression | MISSING — no transfer test file exists |
| GAP-009: Rate-limit smoke test | MISSING — no 429 assertion under load |
| GAP-010: RLS/security regression suite | MISSING — `__tests__/security/` has 1 test only |

### Regression evidence (live)

| Item | File | Status |
|------|------|--------|
| C1 (unsigned cookies) | `__tests__/auth/no-unsigned-cookie-fallback.test.ts` | Exists, 3 assertions |
| C2 (org invite takeover) | `__tests__/organization/org-invite-takeover-guard.test.ts` | Exists, 2 assertions (unit, mocked Supabase) |

### Known risks

- Remote CI status and required-check enforcement remain unverified in this local pass.
- Vitest gate green as of QA-002 closure (2026-09-10); unit-level failures no longer mask product or migration paths.
- E2E money flows (sell, check-in, settle, hire, shift) have no transactional proof.
- RLS policies have no automated regression testing.

## Current focus

- QA-002 closed 2026-09-10: full Vitest suite green (4891 passed / 0 failed / 8 env-gated skips across 512 files); migration chain (288 files) and migration-validation pass incl. ORG-003/ORG-004 manifests; agents:validate passed with 0 errors.
- Next open gaps: E2E money-flow journey (GAP-002), XSS E2E test (GAP-004), CI required-check enforcement (GAP-001/003, unverified locally).

## Next planned tasks (pending owner answers)

- P0: Verify hosted CI workflow status and required-check enforcement (GAP-001/003).
- P0: E2E money-flow journey (GAP-002) — needs Q3 answer
- P0: XSS E2E test (GAP-004) — needs Q4 answer

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- QA-003 is the P0 certification owner for the exact deployed staging SHA.
- Required coverage includes account lifecycle, personas, discovery, events, ticketing, marketplace, messaging, uploads, deletion, negative authorization, webhook replay, transaction races, accessibility, responsive browsers, and performance.
- Certification requires synthetic staging data, Stripe test mode, no accidental skips, zero unresolved P0/P1 defects, and evidence handed to RELEASE-005.

## Next-batch result — 2026-09-16

- QA-003 partially landed a fail-closed launch-certification harness with exact release-SHA, HTTPS/staging, fixture, API lifecycle, replay/concurrency, accessibility, responsive, and performance gates.
- No staging evidence is claimed. The committed fixture manifest, manual workflow wiring, protected secrets, and exact-SHA run remain open.

- `npm run test:e2e:launch` is now wired to `playwright.launch.config.ts`; `fixture.example.json` validates and documents the required protected environment contract. Its endpoint scenarios remain placeholders until staging contracts are approved.

## Launch-certification hardening — 2026-09-18

- `.github/workflows/e2e.yml` now separates pull-request E2E from protected manual launch certification. Manual dispatch requires a full main-branch SHA, checks out that exact commit, and uses the GitHub `staging` environment for all synthetic actor, fixture, Supabase, and Stripe values.
- The committed fixture no longer contains placeholder API scenarios: it exercises foreign-organization denial, signed marketplace webhook replay/deduplication, and marketplace checkout idempotency under a two-request race using application-backed contracts.
- Launch certification fails on placeholder fixture content, unused declared actors, missing protected values, non-HTTPS/localhost targets, SHA mismatch, and any skipped test. Secretless validation discovers 33 tests across lifecycle, desktop, mobile, and tablet projects.
- Hosted certification remains blocked: the local `/api/health` route emits `x-tourify-release-sha` and `x-tourify-deployment-id` only when authoritative Vercel system values are available, but public demo/prod probes on 2026-09-22 returned no release SHA. Protected staging values, isolation proof, and a hosted run remain unavailable.

## QA-004 simulation campaign — 2026-09-22

- QA-004 now owns an event/tour persona campaign with a 718-row candidate coverage ledger across web, iOS, and Android. Rows remain unclassified and unrun until visible UI and device evidence is collected.
- QA-005 locally implements campaign-tagged Auth provisioning with collision refusal; QA-006 locally implements a preview-build mobile evidence gate. Neither has touched hosted staging.
- Public `demo.tourify.live` and `tourify.live` health responses advertised the same Supabase connection origin and no release SHA. RELEASE-007, DB-008, and DB-002 hosted proof remain prerequisites before synthetic users are created.
