# Work architecture

## Boundary

Own jobs, hiring, workforce, staffing, shifts, onboarding, and work mode.

## Primary working set

- `app/work/**`
- `app/jobs/**`
- `app/staffing/**`
- `app/api/hiring/**`
- `app/api/job-applications/**`
- `components/hiring/**`
- `components/job-posting/**`
- `components/work-mode/**`
- `lib/hiring/**`
- `lib/work-mode/**`
- `__tests__/hiring/**`
- `__tests__/jobs/**`
- `__tests__/work-mode/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
