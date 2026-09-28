# Venue architecture

## Boundary

Own venue identity, public profiles, bookings, venue operations, and venue kit.

## Primary working set

- `app/venue/**`
- `app/venues/**`
- `app/api/venue/**`
- `components/venue/**`
- `components/venues/**`
- `components/venue-kit/**`
- `lib/venue/**`
- `__tests__/venue/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
