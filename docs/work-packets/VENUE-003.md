# Work packet: `VENUE-003`

## Goal

- Goal: Document and test the canonical venue booking-request lifecycle state machine.
- Out of scope: venue UI, admin, search, feed, onboarding, release, QA, migrations, and non-venue APIs.
- Owner/status: `venue` / `completed`

## Context

- Affected subsystem: venue booking lifecycle compatibility contract.
- Routes/components/services: `lib/venue/booking-lifecycle.ts`; existing `app/api/venue/booking-requests/route.ts` and database RPC are referenced contracts, not changed by this bounded task.
- References to read first: `docs/DEVELOPMENT_WORKFLOW.md`, `docs/engineering/agents/venue/CHARTER.md`, `docs/engineering/agents/venue/STATE.md`, `docs/engineering/agents/venue/QUESTIONS.md`, `docs/engineering/DECISIONS.md`, `docs/engineering/tasks/active/VENUE-003.json`.
- Known constraints: The worktree is heavily dirty. Preserve unrelated changes. The database migration and RPC remain authoritative for hosted writes; no database reset or migration change is included.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] Booking lifecycle state machine documented and tested.

## Verification

- Tier: `fast`
- Commands: `./node_modules/.bin/vitest run __tests__/venue/booking-lifecycle.test.ts`; `./node_modules/.bin/vitest run __tests__/venue/booking-lifecycle.test.ts lib/venue/__tests__/reservations.test.ts`; `./node_modules/.bin/eslint lib/venue/booking-lifecycle.ts __tests__/venue/booking-lifecycle.test.ts`; `npm run verify:fast -- --changed`.
- Evidence: Lifecycle suite passed 6/6; lifecycle plus reservation regression passed 15/15; focused ESLint passed. The fast wrapper stopped before tests because the dirty worktree is missing pre-existing `components/ui/use-mobile.tsx`. The broad typecheck was stopped without diagnostics under the bounded-task instruction.

## Handoff

- Changed areas: `lib/venue/booking-lifecycle.ts`, `__tests__/venue/booking-lifecycle.test.ts`, and `docs/engineering/agents/venue/BOOKING_LIFECYCLE.md`.
- Failures and pre-existing failures: Focused checks passed. Repository fast verification remains blocked by the pre-existing missing `components/ui/use-mobile.tsx`; no lifecycle failure was observed.
- Blockers: Hosted migration/RLS/backfill acceptance remains an external release gate and is documented as such.
- Next action: Database/release owners should attach hosted migration, RLS, grant, index, and backfill evidence before enabling the lifecycle feature gate.
