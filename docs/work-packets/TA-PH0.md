# Work packet: TA-PH0

## Goal

- Goal: Establish a reproducible test entry path and strict five-city release checks.
- Out of scope: Production deployment, production data, and schema mutation.
- Owner/status: `in_progress`

## Context

- Affected subsystem: Authentication test setup and hiring/tour verification.
- Routes/components/services: `/api/accounts`, auth portal, hiring presenters, West Coast E2E.
- References to read first: TA-001, TA-024, TA-025; `docs/DEVELOPMENT_WORKFLOW.md`.
- Known constraints: Port 3000 currently serves a different checkout. Use a separate port for this repository. Tourify Demo is the test backend.

## Checklist

- [x] Reproduce or confirm the current behavior
- [ ] Implement the smallest scoped change
- [ ] Add or update focused tests
- [ ] Run the selected verification tier
- [ ] Record failures and remaining blockers
- [ ] State the next task

## Acceptance criteria

- [ ] Presenter contract explicitly includes lifecycle and tour/event scope fields.
- [ ] Required five-city E2E stages fail the test when any stage fails.
- [ ] A seeded test user can authenticate against this checkout and read `/api/accounts`.
- [ ] Typecheck result distinguishes source errors from resource failure.

## Verification

- Tier: `feature`
- Commands: focused Vitest, focused Playwright, `npm run typecheck`.
- Evidence: Pending.

## Handoff

- Changed areas: Pending.
- Failures and pre-existing failures: Port 3000 was a separate checkout, not this repository.
- Blockers: None.
- Next action: Update focused tests and run this repository on an isolated port.
