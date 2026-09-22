# General User architecture

## Boundary

Own authentication, onboarding, user profiles, settings, accounts, and the general dashboard.

## Primary working set

- `app/auth/**`
- `app/login/**`
- `app/signup/**`
- `app/onboarding/**`
- `app/profile/**`
- `app/settings/**`
- `app/dashboard/**`
- `components/auth/**`
- `components/onboarding/**`
- `components/profile/**`
- `lib/auth/**`
- `__tests__/auth/**`
- `__tests__/onboarding/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
