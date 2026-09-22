# Work packet: `DESIGN-034`

## Goal

- Goal: Make `TOKEN_REGISTRY.md` an enforced CI contract for global runtime
  token definitions and Tailwind CSS-variable projections.
- Out of scope: token value changes, DESIGN-033 radius/visual QA, venue-session
  behavior, component-local custom properties, and token adoption work.
- Owner/status: `design-system / complete`

## Context

- Affected subsystem: design-token registry and CI checks.
- Routes/components/services: no runtime route or component behavior changes.
- References to read first: `docs/engineering/INDEX.md`, the design-system
  charter/state, `docs/engineering/tasks/active/DESIGN-034.json`,
  `docs/DEVELOPMENT_WORKFLOW.md`, and `TOKEN_REGISTRY.md`.
- Known constraints: preserve the owner-approved token values and the dirty
  worktree; do not generate control-plane maps or edit `TASK_INDEX.json`.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] Every `live`/`conflict` registry role in Tables A–I has a definition in
  a registered global runtime token source.
- [x] Every CSS-variable Tailwind projection maps exactly to an active
  registered role and an exact Table K alias row.
- [x] Unregistered declarations and non-module global token-source files fail
  the check; component-local/module properties are explicitly out of scope.
- [x] Negative fixtures prove failures for missing runtime truth, rogue
  declarations/source files, and Tailwind drift.
- [x] The focused check is wired into the main CI workflow without changing
  runtime token values or Tailwind configuration.

## Verification

- Tier: `fast`
- Commands:
  - `npm run test:token-registry`
  - `npm run check:token-registry`
  - `npx eslint scripts/ci/check-token-registry.mjs scripts/ci/check-token-registry.test.mjs`
  - `git diff --check -- <DESIGN-034 working set>`
  - `npm run agents:validate`
- Evidence: 9/9 positive/negative fixture tests passed, including review-added
  coverage for minified CSS declarations, invalid statuses, source-path escape,
  malformed registry rows, and flattened alias collisions; the repository check
  passed with 126 role rows, 69 active runtime variables, 41 Tailwind
  projections, and 2 registered global sources; lint and diff checks passed.

## Handoff

- Changed areas: one CI checker plus fixture tests, package/CI wiring, exact
  Table K rows and its machine-readable source boundary, and task/domain docs.
- Failures and pre-existing failures: none in the focused gate.
- Review correction: the initial parser missed one-line/minified declarations,
  accepted invalid statuses and repository-escaping source paths, silently
  overwrote flattened alias collisions, and followed filesystem symlinks. The
  checker and fixtures now reject or avoid each case; six historical `removed`
  statuses were normalized to the registry contract's `dead` status.
- Blockers: none. `TASK_INDEX.json` regeneration is reserved for the root
  orchestrator and was not run or edited here.
- Next action: root orchestrator reconciles generated task maps; future global
  token or Tailwind projection changes update `TOKEN_REGISTRY.md` in the same
  change.
