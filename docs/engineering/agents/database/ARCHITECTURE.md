# Database architecture

## Boundary

Own Supabase migrations, schema evolution, RLS, RPCs, generated types, and data integrity.

## Primary working set

- `supabase/**`
- `lib/supabase/**`
- `lib/database.types.ts`
- `docs/engineering/migration-validation/**`
- `__tests__/**/*migration*`
- `__tests__/security/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
