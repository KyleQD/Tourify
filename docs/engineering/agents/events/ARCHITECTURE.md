# Events architecture

## Boundary

Own event creation, lifecycle, calendar and holds, public event surfaces, and shared event consumer contracts.

## Primary working set

- `app/events/**`
- `app/api/events/**`
- `components/events/**`
- `lib/events/**`
- `__tests__/events/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
