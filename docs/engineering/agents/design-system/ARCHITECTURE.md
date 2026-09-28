# Design System architecture

## Boundary

Own shared UI primitives, accessibility, layout, tokens, and interaction consistency.

## Primary working set

- `app/globals.css`
- `components/ui/**`
- `components/layout/**`
- `components/surface/**`
- `tailwind.config.ts`
- `components.json`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
