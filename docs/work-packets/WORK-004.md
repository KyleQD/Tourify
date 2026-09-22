# Work packet: `WORK-004`

## Goal

- Goal: Deliver a worker-first Work Mode overview and secure event workspace with admin communications, reminders, and resilient partial data loading.
- Out of scope: Replacing the full Messages product, exposing draft/admin-only event data, or redesigning admin event publishing beyond reminder support.
- Owner/status: `work / completed`

## Context

- Affected subsystem: Work Mode, workforce communications, and worker publication authorization.
- Routes/components/services: `/work/**`, `/api/work-mode/**`, Work Mode UI/read models, admin communications, notification links, and additive Supabase schema/RLS.
- References to read first: `docs/engineering/INDEX.md`, Work agent charter/state, `docs/DEVELOPMENT_WORKFLOW.md`.
- Known constraints: Preserve extensive unrelated dirty-tree changes; build on current uncommitted Work Mode task support; worker APIs are an explicitly recorded working-set expansion; staged migrations are not assumed applied.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] `/work/overview` is canonical and legacy Today links preserve assignment selection.
- [x] Overview combines actionable invitations, upcoming event positions, tasks, updates, messages, and scheduled reminders without requiring an active assignment.
- [x] Accepted event assignments open a worker-owned event workspace that filters published information by event, assignment status, visibility, and permissions.
- [x] Workers can mark their own communications read or acknowledge them, but cannot mutate another recipient's communication state.
- [x] A failed secondary source does not erase assignments or other successful sections.
- [x] Focused route, read-model, UI-contract, migration, lint, control-plane, and scoped type checks pass or have explicit evidence.

## Verification

- Tier: `feature`
- Commands: Focused Work Mode/hiring/communications Vitest; changed-file ESLint; scoped TypeScript check; migration contract checks; `npm run agents:validate`.
- Evidence: Vitest passed 7 files / 37 tests; changed-file ESLint passed; migration chain passed; the WORK-004 planned migration manifest passed its scan; scoped TypeScript parse/module validation passed; control-plane validation passed with 0 errors.
- Constraints: Semantic TypeScript did not complete because the generated database type graph exceeds the available machine, a documented Work-agent constraint. Repository-wide migration validation is red only for the unrelated missing `20260910230339_ticketing_admin_overview_contract.json` manifest. The final browser runtime smoke was blocked by a pre-existing `EMFILE` watcher state and shared `.next` cache contention; the Overview layout itself rendered during the initial smoke check.

## Handoff

- Changed areas: Work Mode routes, APIs, read model, responsive Overview and event workspace components, admin communications, worker-safe links, shared types, additive schema/RLS, and focused tests.
- Failures and pre-existing failures: The repository-wide migration-manifest failure and four service-role allowlist failures are unrelated to WORK-004 and remain owned by their respective domains.
- Blockers: No implementation blocker. The migration is staged, not applied.
- Next action: Apply `20260911013017_work_mode_overview_communications.sql` through the gated database pipeline, then run a clean authenticated browser smoke test against the migrated environment.
