# Orchestrator architecture

## Boundary

Route bounded work, manage dependencies and overlaps, and maintain project-level execution truth.

## Primary working set

- `AGENTS.md`
- `ARCHITECTURE.md`
- `docs/engineering/**`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/DEVELOPMENT_BACKLOG.md`
- `.agents/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
