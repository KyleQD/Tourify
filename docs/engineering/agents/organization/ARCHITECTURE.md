# Organization architecture

## Boundary

Own organization identity, membership, tours, collaboration, and tenant context.

## Primary working set

- `app/organization/**`
- `app/orgs/**`
- `app/tours/**`
- `app/api/orgs/**`
- `app/api/tours/**`
- `components/public-organization/**`
- `lib/organization/**`
- `__tests__/organization/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.

## Identity model

- `organizations.id` is the canonical tenant id.
- `org_members` is the server-side authorization boundary for tenant access.
- `organizer_accounts.id` is the public/ops profile id and is linked to the tenant by `ops_org_id`.
- `accounts` is a compatibility/search projection keyed to the organizer profile; it is not an authorization source.

The shared runtime mapping is defined in `lib/organizations/identity.ts`. A profile without `ops_org_id` is legacy/unscoped and cannot be used to establish organization authorization.
