# Artist architecture

## Boundary

Own artist identity, private and public profiles, EPKs, dashboards, and artist workflows.

## Primary working set

- `app/artist/**`
- `app/api/artist/**`
- `components/artist/**`
- `components/artist-profile/**`
- `components/public-artist/**`
- `lib/artist/**`
- `__tests__/artist/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
