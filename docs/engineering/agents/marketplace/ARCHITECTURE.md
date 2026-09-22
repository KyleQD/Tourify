# Marketplace architecture

## Boundary

Own marketplace listings, services, carts, checkout, orders, and commerce workflows.

## Primary working set

- `app/marketplace/**`
- `app/services/**`
- `app/api/marketplace/**`
- `components/marketplace/**`
- `lib/marketplace/**`
- `__tests__/marketplace/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
