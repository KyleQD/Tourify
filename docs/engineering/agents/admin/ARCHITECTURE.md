# Admin architecture

## Boundary

Own admin dashboards, admin operations, authorization gates, and audit registries.

## Primary working set

- `app/admin/**`
- `app/api/admin/**`
- `components/admin/**`
- `lib/admin/**`
- `__tests__/admin/**`
- `.agents/admin-*/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
