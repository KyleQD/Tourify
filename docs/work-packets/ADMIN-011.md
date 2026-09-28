# Work packet: `ADMIN-011`

## Goal

- Goal: Make authenticated event/tour-scoped site-map creation reliably open the full-screen builder under the selected acting organization.
- Out of scope: Database migrations, authorization relaxation, site-map import modernization, and venue/artist site-map surfaces.
- Owner/status: `admin / active`

## Context

- Affected subsystem: Admin Logistics Maps workspace and shared Admin site-map client state.
- Routes/components/services: Logistics site-map manager, site-map hook, canonical Admin site-map links, and focused UI regression coverage.
- References to read first: `docs/engineering/INDEX.md`, Admin charter/state, `docs/DEVELOPMENT_WORKFLOW.md`, and `ADMIN-011`.
- Known constraints: Preserve concurrent dirty-tree work; the API contract remains camelCase `eventId`/`tourId`; the acting organization remains the authorization source of truth.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] Site-map reads and mutations use the selected acting-organization request context.
- [x] A successful create response opens the builder even if an older list response arrives later.
- [x] Event-only, tour-only, and combined scope remain stable in the canonical Maps URL.
- [x] Failed or unauthorized creation never leaves an indefinite opening overlay.
- [x] Organization-owner creation writes through the server-validated organization/event/tour scope.
- [x] Focused component, scope, authorization, contract, lint, and control-plane checks pass.

## Verification

- Tier: `feature`
- Commands: focused Vitest suites; focused ESLint; `npm run verify:fast -- --changed`; `npm run agents:validate`.
- Evidence: Focused Vitest passed 8 files / 54 tests; focused ESLint passed; Admin route registry passed (291 routes, 54/54 legacy classifications). The local browser loaded without an error overlay but redirected the isolated session to login, so authenticated manual confirmation is handed back to the user. `verify:fast -- --changed` is blocked by an unrelated deleted venue-calendar file, and full typecheck reports pre-existing repository-wide errors.

## Handoff

- Changed areas: Admin site-map manager/wizard/hook, Admin site-map API collection route, Admin site-map consumers, canonical link helper, and focused tests.
- Failures and pre-existing failures: Changed-files verification cannot start because `app/venue/components/booking-calendar.tsx` is deleted in unrelated dirty work; full TypeScript verification has broad pre-existing failures.
- Blockers: The isolated verification browser has no authenticated Tourify session; the user's authenticated retry is required for final manual confirmation.
- Next action: Refresh Logistics and retry the same event/tour creation flow; any remaining server response is now visible inline in the wizard.
