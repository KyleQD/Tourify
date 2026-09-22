# QA questions for the product owner

Generated: 2026-09-10 | Task: QA-001 | Source SHA: 7cf660ad

Prioritized P1 → P4. Each question maps to one or more GAPS.md items.

---

## P1 — Blocking decisions (must answer before QA can plan next tasks)

### Q1: Hosted CI and required-check evidence (→ GAP-001, GAP-003)
**Build vs fix vs drop:** FIX/VERIFY. The repository contains 16 tracked workflows, including `.github/workflows/ci.yml` and `.github/workflows/e2e.yml`; the original finding that CI files were absent was corrected. What remains is hosted-run and branch-protection evidence.
- Can the owner provide or authorize verification of successful hosted runs and the required status name(s) for `e2e.yml` and the main CI gate?
- If a check is missing or not blocking merges/deploys, should QA and release fix the workflow/gate wiring, or should the requirement be dropped for a named environment?
- **Sequencing:** Launch gate G3 depends on green CI + e2e required; no pipeline needs to be created from scratch.

### Q2 (RESOLVED): Vitest failure queue (→ GAP-005)
**Build vs fix vs drop:** FIX completed by QA-002. The full suite is green at the reviewed SHA, with eight environment-gated live-DB skips documented in `docs/engineering/tasks/completed/QA-002.json`. No owner decision is required unless the product/schema contracts change again.

### Q3: E2E money-flow test depth (→ GAP-002, GAP-013)
**Build vs fix vs drop:** The current E2E specs navigate but don't assert transactions. Building full sell→check-in→settle and hire→assign-shift journeys requires:
- A seeded test event with ticket inventory
- A Stripe test-mode checkout or mock
- A seeded job posting with shift slots

Should the QA agent:
- (a) **Build** full transactional E2E with Stripe test-mode, or
- (b) **Fix** to assert up to the payment/assignment boundary (no money movement), or
- (c) **Drop** these from E2E and rely on Jest integration tests for money flows?

**Sequencing:** Affects launch gate G3 and e2e.yml required-check scope.

### Q4: XSS E2E scope (→ GAP-004)
**Build vs fix vs drop:** WS-0.7 calls for "e2e XSS-payload test". Should this be:
- (a) A **Playwright test** injecting `<script>` and `javascript:` payloads into post/comment forms and asserting they're escaped in the DOM, or
- (b) A **Jest test** against `formatContent` directly, or
- (c) Both?

**Sequencing:** P0 scope. Low effort if (b); medium effort if (a).

---

## P2 — Important decisions (before first QA sprint)

### Q5: RLS regression suite strategy (→ GAP-010)
**Build vs fix vs drop:** No systematic RLS testing exists. Should the QA agent:
- (a) **Build** a `__tests__/rls/` suite that creates users at different permission levels and asserts SELECT/INSERT/UPDATE/DELETE behavior against a real Supabase (requires service role + anon key in test env), or
- (b) **Build** mock-based tests that assert the SQL policy logic, or
- (c) **Drop** and rely on the database agent's migration CI + manual audits?

### Q6: Forged-cookie test scope expansion (→ GAP-006)
**Build vs fix vs drop:** Current C1 regression tests only the generic auth helpers. The backlog says "every listed route." Should we:
- (a) **Expand** to test each of the 9+ consumer routes (messages, social, groups) individually, or
- (b) **Keep** the helper-level test and add a note that route-level coverage is implicit, or
- (c) **Build** a parameterized test that iterates over all authenticated route handlers?

### Q7: Rate-limit smoke test environment (→ GAP-009)
**Build vs fix vs drop:** WS-1.3 requires "real Upstash." Should this be:
- (a) A **Playwright E2E** hitting API routes repeatedly and asserting 429, or
- (b) A **Jest integration test** using the Upstash Redis client directly, or
- (c) A **manual runbook** step that's documented but not automated?

---

## P3 — Nice-to-have decisions (before Phase 2–3)

### Q8: Accessibility testing commitment (→ GAP-012)
**Build vs fix vs drop:** WS-2.6 calls for axe scans. Should QA:
- (a) **Build** `@axe-core/playwright` integration in the E2E suite for auth, feed, ticket purchase, messaging, or
- (b) **Build** a standalone axe CLI scan, or
- (c) **Drop** from automated testing and keep as a manual pre-launch checklist?

### Q9: Mobile E2E investment (→ GAP-016)
**Build vs fix vs drop:** The Expo mobile app has 24 screens and zero automated tests. Should QA:
- (a) **Build** a Detox or Maestro harness, or
- (b) **Build** Playwright against the mobile web viewport, or
- (c) **Drop** mobile E2E from scope until post-launch?

### Q10: Visual regression tooling (→ GAP-017)
**Build vs fix vs drop:** No visual regression exists. Should QA:
- (a) **Build** Playwright screenshot comparison for key pages, or
- (b) **Build** Chromatic integration, or
- (c) **Drop** and rely on manual review?

---

## P4 — Maintenance decisions

### Q11: E2E auth helper consolidation (→ GAP-018)
**Build vs fix:** Should the duplicated cookie-injection code in `04-qa-multi-persona-clickthrough.spec.ts` be refactored to use the shared `qa-flow-auth.ts` helper? (Low effort, pure cleanup.)

### Q12 (RESOLVED): QA script npm run alias verification (→ GAP-019)
**Build vs fix:** Verification completed during QA-001. Every command referenced in `docs/qa-account-matrix.md` and `docs/qa-artist-store-completion.md` is present in `package.json`; no follow-up task is required unless the documentation or scripts change.

### Q13: Test coverage CI reporting (→ GAP-014)
**Build vs fix:** Should QA add `vitest --coverage` to the verify:release tier or create a separate coverage gate? (Low effort if added to verify.mjs.)

### Q14: Ticket transfer regression tests (→ GAP-008)
**Build vs fix vs drop:** WS-0.3 calls for regression tests on both email-addressed and ownership-claim transfer paths. Should QA:
- (a) **Build** Jest integration tests against the transfer route, or
- (b) **Build** a Playwright E2E for the full transfer journey, or
- (c) **Drop** if the transfer code is being rewritten in Phase 1 (full single-RPC transaction)?

### Q15: Debug route security tests (→ GAP-020)
**Build vs fix vs drop:** Should QA add tests asserting `/api/debug/*` routes return 403/404 in production mode? `check:production-debug` script exists as a grep but no runtime assertion.

---

## Summary for orchestrator

| Priority | Questions | Key blocking topic |
|----------|-----------|-------------------|
| P1 | Q1, Q3–Q4 | Hosted CI evidence, E2E depth, XSS test |
| P2 | Q5–Q7 | RLS suite, cookie-route coverage, rate-limit tests |
| P3 | Q8–Q10 | A11y, mobile E2E, visual regression |
| P4 | Q11, Q13–Q15 | Cleanup, coverage, ticket transfer, debug routes; Q12 alias check resolved |
