# Release architecture

## Boundary

Own CI, deployment, environment validation, observability, cron, and release readiness.

## Primary working set

- `.github/workflows/**`
- `vercel.json`
- `docker/**`
- `instrumentation.ts`
- `sentry.*.config.ts`
- `scripts/ci/**`
- `scripts/deploy.sh`
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
