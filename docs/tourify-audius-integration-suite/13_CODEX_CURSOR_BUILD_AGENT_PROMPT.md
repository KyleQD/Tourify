# 13 — Codex/Cursor Build-Agent Prompt

Copy the prompt below into the coding agent with repository access.

---

You are implementing Audius playback inside the existing Tourify music player ecosystem. Work directly in the current Tourify repository and use the repository’s actual architecture, conventions, and existing abstractions as the source of truth.

## Non-negotiable operating rules

1. **Audit before editing.** Do not implement feature code until you have completed and saved an audit of the current music/player architecture.
2. **Non-destructive integration.** Preserve all existing Tourify music uploads, tracks, playlists, posts, analytics, profile features, and playback behavior.
3. **Additive database changes only.** Never reset Supabase. Never drop, rename, truncate, or destructively change production tables/columns. Use new timestamped migrations, nullable columns, new tables, indexes, RLS policies, and forward-compatible code.
4. **Provider abstraction.** Audius must be implemented behind a provider adapter and normalized Tourify domain contracts. Generic UI and player code must not depend on raw Audius payloads.
5. **Temporary stream URLs.** Resolve them at playback time. Never store them in Supabase, local persistence, analytics, or logs.
6. **Feature flags and rollback.** Audius search, import, display, and playback must be independently disableable. Native Tourify playback must continue when Audius is unavailable.
7. **Progress JSON.** Create `docs/audius/implementation-progress.json` from the provided template. Update it immediately as work proceeds. It is a required implementation artifact, not a final summary.
8. **Do not conceal pre-existing failures.** Record them separately from regressions caused by this implementation.
9. **No speculative file edits.** Confirm every file target through repository inspection.
10. **Verify current Audius requirements.** Use current official Audius documentation for API endpoints, authentication, host/discovery behavior, streaming, rate limits, attribution, and caching. Record the verification date and decisions in the audit.

## Required first step: full audit

Inspect and document:

- Framework, package manager, scripts, environment handling, deployment configuration, lint, tests, and build commands.
- Existing global music player component, mounting point, state/store/context, queue, audio element/library, route persistence, Media Session behavior, mobile player, autoplay handling, and error handling.
- Canonical track/song/audio/release/album/playlist types and database records.
- Upload/storage pipeline and existing provider/source fields.
- APIs, server actions, GraphQL/Genql paths, and Supabase queries related to music.
- Artist profile, feed, post composer, playlist, discovery, search, and analytics integrations.
- Supabase migrations, RLS policies, helper functions, generated types, and existing analytics tables.
- Existing feature flags, rate limits, logging, telemetry, and request ID utilities.
- Any existing Audius code.

Run baseline commands before edits. At minimum, use the repository equivalents of:

```bash
install/dependency verification
lint
typecheck
unit/integration tests
production build
```

Create:

- `docs/audius/AUDIT_REPORT.md`
- `docs/audius/ARCHITECTURE_DECISIONS.md`
- `docs/audius/implementation-progress.json`

The audit must list exact confirmed file targets and explain which existing components will be reused, extended, or wrapped.

## Implementation phases

### Phase 1 — Provider-neutral contracts and registry

- Define or extend canonical provider ID, provider reference, normalized track, queue item, playback descriptor, provider error, and adapter interfaces.
- Reuse existing types where possible.
- Add a provider registry/factory.
- Preserve native tracks through compatibility mapping or a native adapter.
- Add disabled-by-default Audius configuration/flags.

Acceptance criteria:

- Existing native player code compiles.
- No UI consumes raw Audius payloads.
- Audius can be registered and disabled centrally.

### Phase 2 — Additive Supabase migrations

- Identify the correct canonical track table and existing integration patterns.
- Add provider-reference persistence only if not already present.
- Add unique constraints for provider/external track identity.
- Add indexes, timestamps, availability state, bounded metadata, optional import audit records, and RLS.
- Extend existing analytics storage only where necessary.
- Regenerate Supabase types.
- Add validation SQL and migration tests.

Acceptance criteria:

- Migrations apply to a production-like database without reset.
- Existing rows remain valid.
- Duplicate external references are prevented.
- Authorized and unauthorized RLS tests pass.

### Phase 3 — Audius provider adapter

Implement a server-only Audius module using current official API behavior:

- Config.
- HTTP client with abort timeout.
- Runtime response schemas.
- Track/artist mappers.
- Search.
- Metadata lookup.
- Playback resolution.
- Error normalization.
- Health/latency metrics.
- Safe bounded retries for idempotent operations.
- Fixture-based tests.

Acceptance criteria:

- Adapter implements the common interface.
- Provider errors map to stable Tourify error codes.
- No temporary playback URL is persisted or logged.

### Phase 4 — Backend APIs/server actions

Implement or extend repository-standard paths for:

- Audius search.
- Provider track metadata.
- Import/link to a canonical Tourify track.
- Playback resolution by canonical track ID.
- Playback/import analytics.

Requirements:

- Runtime input validation.
- Authentication and acting-account authorization.
- Per-operation rate limiting.
- Request IDs and redacted structured logs.
- Idempotent imports.
- Bounded metadata caching.
- `private, no-store` or safer verified handling for temporary playback resolution.

Acceptance criteria:

- Integration tests cover success, duplicate import, unauthorized write, timeout, rate limit, unavailable track, and disabled flag.

### Phase 5 — Global player refactor

Refactor minimally and safely:

- Queue canonical normalized items, not stream URLs.
- Resolve playback when a track becomes current.
- Add `resolving`, `loading`, `playing`, `paused`, `ended`, and `error` states if not already present.
- Abort stale resolution requests.
- Ignore out-of-order responses.
- Prevent duplicate play/ended transitions.
- Preserve queue, previous/next, seek, volume, mute, repeat, shuffle, route persistence, mobile controls, keyboard accessibility, and Media Session behavior.
- Persist only safe state; never persist temporary URLs.

Acceptance criteria:

- Native playback regression tests pass.
- Mixed Tourify/Audius queue works.
- Rapid switching cannot load the wrong track.

### Phase 6 — Frontend integration

Implement behind flags:

1. Audius search/import modal in the existing artist music management surface.
2. Provider-aware normalized track cards.
3. Public artist profile playback.
4. Feed/post attachment after the profile path is stable.
5. Attribution, canonical provider link, artwork fallback, loading, unavailable, retry, and permission states.
6. Keyboard and screen-reader support.

Do not automatically claim an Audius artist identity belongs to a Tourify user based on matching names.

Acceptance criteria:

- Authorized user can import once and sees “already added” on duplicates.
- Public listener can play through the global player.
- Audius disablement removes actions without breaking existing tracks.

### Phase 7 — Analytics and telemetry

Extend the existing analytics pipeline. Include:

- Provider.
- Canonical track ID.
- External provider track ID where permitted.
- Playback session ID.
- Source surface.
- Request ID.
- Stable error code.
- Position/duration milestones.

Deduplicate start, progress, completion, retry, and failure events. Never send temporary URLs or secrets.

Add dashboards/metrics or documentation for:

- Search and playback resolution latency.
- Playback start success.
- Time to first audio.
- Provider timeout/unavailable rate.
- Native versus Audius regression comparison.

### Phase 8 — Testing, rollout, and documentation

- Complete unit, integration, component, E2E, migration, RLS, accessibility, browser, and performance tests.
- Deploy dark infrastructure first.
- Enable internal cohort, then design partners, limited beta, and general availability only after stage gates pass.
- Test immediate feature-flag rollback.
- Write incident and provider-outage runbooks.
- Update all docs and progress JSON.

## Expected file targets

Do not assume these exact paths. Replace them with actual audited paths:

```text
lib/music/contracts.ts
lib/music/provider-registry.ts
lib/music/providers/audius/*
app/api/music/providers/audius/*
app/api/music/playback/resolve/*
app/api/music/import/*
components/music/*
components/player/*
contexts/player-context.tsx or stores/player-store.ts
supabase/migrations/*
docs/audius/*
```

## Coding standards

- Follow existing Tourify patterns before introducing new libraries.
- TypeScript strict; no unvalidated external data.
- Prefer Zod or the project’s existing runtime validator.
- Avoid `any`; document unavoidable provider-boundary exceptions.
- Small, testable modules.
- No provider-specific branching scattered through generic components.
- Use existing authentication, acting-account, logging, API response, feature flag, and analytics helpers.
- Keep migrations additive, reviewed, and restart-safe.
- Do not modify unrelated code to make checks pass unless the dependency is documented and the fix is safe.

## Progress JSON protocol

For every task update:

- Set status: `pending`, `in_progress`, `blocked`, `complete`, or `not_applicable`.
- Record exact changed files.
- Record commands run and results.
- Record blockers.
- Record implementation decisions and deviations from this plan.
- Link acceptance evidence.

Do not mark a phase complete until all acceptance criteria pass.

## Required final report

Produce `docs/audius/FINAL_IMPLEMENTATION_REPORT.md` containing:

- Audit summary.
- Final architecture.
- Database migrations.
- Exact changed-file inventory.
- Tests and command results.
- Known limitations.
- Security and compliance review status.
- Rollout and rollback instructions.
- Remaining optional enhancements.
- Confirmation that the database was not reset and all schema changes were additive.

Begin now with the audit and progress JSON. Do not start implementation code until the audit artifacts are complete.

---
