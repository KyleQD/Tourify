# Design System verification

Start with the task tier from `docs/DEVELOPMENT_WORKFLOW.md`.

## Current evidence

- `npm run agents:context -- --task DESIGN-001` — bounded packet built before audit.
- `npm run agents:generate` — refreshed SHA-matched route, API, component, database,
  permission, and integration maps.
- DESIGN-002 — scoped TypeScript, ESLint, and diff checks passed for the canonical hook.
- DESIGN-003 — focused Vitest (3 tests), ESLint, scoped TypeScript, and task-file diff
  checks passed for shared state primitives.
- `npm run agents:validate` — required final control-plane check; record its exact result
  in the task record.

## Follow-up gate

The design-system domain still needs a focused primitive/layout suite, a browser-level
axe/focus gate, token consistency checks, and reduced-motion coverage. Do not claim those
gates from the current shared-state tests alone.
