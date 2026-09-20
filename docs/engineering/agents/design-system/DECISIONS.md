# Design System decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DESIGN-001 — Reconciled canonical shared contracts

- Date: 2026-09-10
- Status: accepted
- Task: DESIGN-001 / DESIGN-002 / DESIGN-003
- Decision: `hooks/use-mobile.ts` is the canonical shared responsive hook. The shared
  state contracts are `components/ui/empty-state.tsx`, `error-state.tsx`, and
  `skeleton.tsx`; domain wrappers may remain only while an owning-agent adoption task is
  active.
- Evidence: `docs/engineering/tasks/completed/DESIGN-002.json`,
  `docs/engineering/tasks/completed/DESIGN-003.json`,
  `__tests__/design-system/shared-state-primitives.test.tsx`.
- Consequences: new shared callers use the canonical contracts; the remaining venue/admin
  copies and domain state implementations are migration debt, not new primitives.

## DESIGN-002 — Generated maps are navigation evidence only

- Date: 2026-09-10
- Status: accepted
- Task: DESIGN-001
- Decision: Use refreshed generated route/component/API/database/integration maps to locate
  design-system callers and dependencies, but verify behavior in source, migrations, tests,
  or runtime evidence.
- Evidence: `docs/engineering/generated/README.md`, refreshed maps at SHA
  `7cf660ad8422dbd3adbdb77369d94638cdc2231b`.
- Consequences: generated counts in the baseline are context, not claims that the
  design-system agent owns routes, API handlers, or database objects.
