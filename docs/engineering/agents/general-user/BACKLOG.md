# General User backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.
The domain baseline is `BASELINE.md`; gaps are triaged in `GAPS.md`; owner questions are in
`QUESTIONS.md`.

## Active

- `USER-003` — unified settings surface; broader family rewrite remains gated
  by its recorded owner decision.
- `USER-005` — authentication and account-lifecycle launch readiness.
- `USER-006` — decide whether the zero-caller generic private-docs signed-upload
  route is adopted by one named consumer or retired with explicit authorization
  and preserved settings/account-deletion contracts.

## Candidate (after owner answers to `QUESTIONS.md`)

1. Canonical onboarding surface (QUESTIONS Q1) — consolidate `app/onboarding/hire/[token]`,
   `app/onboarding/[token]`, `enhanced-onboarding-flow`, and the `/onboarding` router entry;
   align `unified`/`submit`/`create-account`/`[token]`/`validate-invitation` APIs.
2. Canonical settings components (Q2) — keep `EnhancedSettingsRouter` + one implementation per
   section; wire `/settings/notifications` and `/settings/profile-colors` into the router or
   declare out of scope.
3. Canonical profile contract (Q3) — one typed PATCH/GET for `/api/profile/*` +
   `/api/settings/profile*` used by the settings editor and public profile page.
4. GDPR erasure coverage (Q4/WS-2.4) — explicit deletes/cascade docs for
   `portfolio_items`, `experiences`, `certifications`, skills, layouts, messages,
   `user_active_profiles`, `agent_credentials.auth_user_id`; add a deletion route test.
5. Username/URL uniqueness (Q5) — unify `check-username` + `check-slug` availability or
   document namespaces.
6. Auth helper consolidation + commit WS-0.1 regression tests (Q6) — migrate `lib/auth/server.ts`
   consumers to `lib/auth/api-auth.ts`; extend forged-cookie test to the bearer path.
7. `/api/auth/session` — implement or remove (Q7).
8. Dashboard canonical implementation (Q8) — `app/dashboard/page.tsx` vs
   `optimized-dashboard.tsx`; sub-surface ownership (bookings/staff-ops/store) handoff decision.
9. Mobile parity (Q9) — mobile signup metadata + auth-provider alignment.
10. Portfolio privacy default + validation (Q10).
11. Test runner unification + committed API tests (Q11).
12. Legacy client implicit-flow fallback removal (Q12).

## Done

- USER-001 — General User workspace audit: `BASELINE.md`, `GAPS.md`, `QUESTIONS.md` produced;
  `STATE.md` updated; no production code changed.
- Control-plane bootstrap created.

## P0 production launch task — 2026-09-16

- **USER-005** — certify signup, verification, login/logout, reset, onboarding, persona switching, sessions, redirect allowlists, deletion, retention, and negative authorization in isolated staging.
- **USER-003** remains non-P0 unless a core certification journey proves it blocks launch.
- **USER-006** is a bounded P1 privacy/security disposition. It may not mutate
  storage policy or delete the route without its recorded database, consumer,
  and QA dependencies.

## USER-005 execution checkpoint — 2026-09-16

- Local lifecycle hardening is implemented and focused auth/privacy tests pass (17 files, 76 tests).
- Remaining acceptance is blocked on isolated staging credentials, deployed negative-authorization evidence, and INTG-003/DB-008 MFA/schema prerequisites.
