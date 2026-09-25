# Work packet: `DESIGN-036`

## Goal

- Goal: Provide reusable, accessible presentation patterns for the admin Logistics command center.
- Out of scope: Logistics data fetching, routing, API contracts, page integration, site maps, migrations, and live mock/fallback data.
- Owner/status: `design-system / active`

## Context

- Affected subsystem: Admin design system and Logistics presentation.
- Routes/components/services: New presentation-only components under `components/admin/logistics/command-center/**`.
- References to read first: `docs/engineering/INDEX.md`, design-system charter/state, `docs/DEVELOPMENT_WORKFLOW.md`, admin dashboard builder methodology.
- Known constraints: Preserve concurrent work; reuse canonical shared state primitives; status cannot rely on color; unavailable data cannot appear as zero.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [ ] Run the selected verification tier
- [ ] Record failures and remaining blockers
- [ ] State the next task

## Acceptance criteria

- [x] Attention rows expose severity, domain, context, owner, due time, freshness, reason, and an accessible action.
- [x] Readiness and source-health patterns use visible text in addition to color and preserve blocked/degraded/unavailable reasons.
- [x] Summary stats distinguish available, partial, and unavailable values so failed sources never appear as healthy zeroes.
- [x] Loading, empty, and error patterns have semantic accessible states and reusable action slots.
- [x] Components contain no fetching, routing decisions, or mock live data.
- [ ] Focused tests, lint, type checking, and fast verification pass or have documented pre-existing failures.

## Verification

- Tier: `fast`
- Commands:
  - `npx vitest run __tests__/design-system/logistics-command-center-patterns.test.tsx`
  - `npx eslint components/admin/logistics/command-center __tests__/design-system/logistics-command-center-patterns.test.tsx`
  - `npm run typecheck`
  - `npm run verify:fast -- --changed`
  - `npm run agents:validate`
- Evidence: Pending.

## Handoff

- Changed areas: Reusable Logistics command-center presentation primitives and focused accessibility tests.
- Failures and pre-existing failures: Pending verification.
- Blockers: None.
- Next action: Parent admin task integrates the primitives into the new Overview and scoped workspaces.
