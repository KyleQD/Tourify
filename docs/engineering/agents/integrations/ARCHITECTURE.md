# Integrations architecture

## Boundary

Own external providers, webhooks, credential boundaries, workers, and integration resilience.

## Primary working set

- `app/api/webhooks/**`
- `app/api/integrations/**`
- `lib/integrations/**`
- `lib/services/*email*`
- `scripts/*worker*`
- `__tests__/integrations/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
