# 00 — Master Implementation Roadmap

## Mission

Add Audius as a first-class playback provider in Tourify without replacing or destabilizing existing music features.

## Phase 0 — Repository and environment audit

### Tasks

- Inspect package scripts, framework versions, route conventions, state management, tests, and deployment configuration.
- Locate all music/player files and build a dependency map.
- Inspect Supabase migrations, schema, RLS, generated types, and music storage.
- Identify all surfaces that create, read, display, queue, or analyze tracks.
- Search for any existing Audius code or provider abstraction.
- Run baseline typecheck, lint, tests, and production build.
- Record pre-existing failures separately.

### Deliverables

- `docs/audius/AUDIT_REPORT.md`
- Existing architecture map.
- Baseline command results.
- Confirmed file targets.
- Updated progress JSON.

### Acceptance criteria

- No implementation begins before the audit is written.
- Every proposed modification maps to an existing file or a justified new file.
- Pre-existing failures are distinguished from introduced failures.

## Phase 1 — Contracts and provider architecture

### Tasks

- Define provider-neutral track, reference, playback, and error contracts.
- Implement provider registry.
- Wrap existing native playback as an adapter when needed, or add compatibility mapping.
- Add feature flags/configuration.

### Dependencies

- Audit complete.
- Existing type conventions understood.

### Risks

- Over-abstraction or duplicate types.
- Breaking native player assumptions.

### Acceptance criteria

- Existing tracks compile through the new contracts.
- Audius can be registered without UI changes.

## Phase 2 — Additive Supabase persistence

### Tasks

- Add provider-reference persistence using additive migrations.
- Add RLS and indexes.
- Add optional import audit records.
- Extend analytics storage only if required.
- Regenerate database types.

### Acceptance criteria

- Production-like migration test passes.
- Existing data remains valid.
- Duplicate external references are prevented.

## Phase 3 — Audius adapter

### Tasks

- Verify current official Audius API behavior.
- Implement client, schemas, mappers, errors, health checks, and tests.
- Implement metadata search and playback resolution.

### Acceptance criteria

- Fixture-based tests pass.
- Timeouts and provider errors map to stable Tourify errors.
- No raw provider response reaches general UI code.

## Phase 4 — Backend APIs

### Tasks

- Add search, metadata, import/link, playback resolution, and analytics endpoints or server actions.
- Apply authentication, authorization, rate limiting, caching, request IDs, and validation.
- Ensure import idempotency.

### Acceptance criteria

- Contract and integration tests pass.
- Cross-account writes are denied.
- Temporary source URLs are no-store and never persisted.

## Phase 5 — Global player compatibility refactor

### Tasks

- Normalize queue items.
- Add resolving/loading states.
- Add request cancellation and stale-response protection.
- Preserve native playback and route persistence.
- Update Media Session metadata and analytics hooks.

### Acceptance criteria

- Native regression suite passes.
- Mixed-provider queue works.
- Rapid track switching does not race.

## Phase 6 — Frontend surfaces

### Tasks

- Build Audius search/import UI in artist music management.
- Add provider-aware track card presentation.
- Add public-profile playback.
- Add feed/post integration after profile flow is stable.
- Implement loading/error/disabled/accessibility states.

### Acceptance criteria

- End-to-end artist import and listener playback works.
- Attribution is correct.
- Duplicate imports are prevented.

## Phase 7 — Analytics, observability, and operations

### Tasks

- Add provider-aware analytics properties.
- Add deduplication and progress milestones.
- Add adapter/API/player metrics and alerts.
- Create incident and rollback runbooks.

### Acceptance criteria

- Audius reliability is visible independently.
- No sensitive playback URL is logged.

## Phase 8 — Validation and staged rollout

### Tasks

- Complete browser, accessibility, migration, performance, and E2E validation.
- Deploy dark infrastructure.
- Enable internal users, design partners, limited beta, then general availability.
- Conduct rollback drill.

### Acceptance criteria

- Definition of Done complete.
- Stage gates approved.
- Progress JSON has no incomplete required tasks.

## Suggested dependency order

```text
Audit
  → Contracts/registry
  → Database persistence
  → Audius adapter
  → Backend APIs
  → Global player
  → UI surfaces
  → Analytics/operations
  → Rollout
```

## Coding standards

- Follow repository linting, formatting, imports, and naming.
- TypeScript strict; avoid `any` unless documented at a provider boundary.
- Validate external payloads at runtime.
- Prefer small composable functions.
- Do not duplicate authentication or acting-account logic.
- Add comments for non-obvious provider behavior, not obvious code.
- Keep provider concerns out of generic components.
- Make migrations and scripts idempotent where possible.

## Required progress discipline

At the start of each phase:

1. Set phase status to `in_progress`.
2. Add discovered file targets.
3. Record dependencies and blockers.

After each task:

1. Mark status.
2. Add changed files.
3. Add validation commands and results.
4. Record decisions and deviations.

A phase may be marked complete only after its acceptance criteria pass.
