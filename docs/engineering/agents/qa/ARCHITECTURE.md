# Qa architecture

## Boundary

Own test strategy, fixtures, end-to-end journeys, regression evidence, and quality gates.

## Primary working set

- `__tests__/**`
- `tests/**`
- `scripts/qa/**`
- `playwright.config.ts`
- `vitest.config.ts`
- `jest.config.cjs`
- `docs/qa-*.md`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
