# Music architecture

## Boundary

Own music catalog, playback, rights, royalties, ingestion, and music worker flows.

## Primary working set

- `app/music/**`
- `app/api/music/**`
- `components/music/**`
- `lib/music/**`
- `lib/playback/**`
- `scripts/music-*.ts`
- `__tests__/music/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
