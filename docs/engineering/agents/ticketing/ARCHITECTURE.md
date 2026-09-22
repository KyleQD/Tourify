# Ticketing architecture

## Boundary

Own tickets, allocations, transfers, wallet, guest list, door operations, and settlement interfaces.

## Primary working set

- `app/tickets/**`
- `app/api/ticketing/**`
- `components/ticketing/**`
- `components/ticket-type/**`
- `lib/ticketing/**`
- `__tests__/ticketing/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
