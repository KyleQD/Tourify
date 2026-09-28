# Tourify × Audius Integration — Implementation Plan

## Overview

Add Audius as a first-class music playback provider in Tourify without replacing or destabilizing any existing music features. Audius tracks will be searchable, importable into artist profiles, playable via the existing Jukebox player, and measurable through the existing analytics pipeline.

The work follows the 9-phase roadmap defined in `docs/tourify-audius-integration-suite/` and is broken into independent sub-tasks that can be reviewed one at a time. Implementation proceeds phase by phase; no phase starts until the previous one's acceptance criteria are satisfied and recorded in the progress JSON.

**Key constraints:**
- No destructive database changes. All migrations are additive.
- `JukeboxTrack` and the `JukeboxProvider` context are the integration seams — they are extended, not replaced.
- Temporary Audius stream URLs are never stored, persisted, logged, or returned beyond a single playback resolution response.
- All Audius surfaces are gated by `AUDIUS_ENABLED` env flag (server) and feature-flag checks.
- The `artist_music` table is the canonical track store. Audius tracks get a row here too, plus a row in a new `music_provider_references` table.

---

## Sub-Task 1 — Audit Report, Progress JSON, and Docs Setup

**Status:** `[x] done`

**Intent:**
Produce the required audit artifacts before a single line of implementation code is written. The doc suite requires `docs/audius/AUDIT_REPORT.md`, `docs/audius/ARCHITECTURE_DECISIONS.md`, and `docs/audius/implementation-progress.json` before Phase 1 begins.

**Expected Outcomes:**
- `docs/audius/AUDIT_REPORT.md` exists with confirmed architecture findings.
- `docs/audius/ARCHITECTURE_DECISIONS.md` exists with provider strategy decisions.
- `docs/audius/implementation-progress.json` created from the template, Phase 0 tasks populated.
- No implementation code changed.

**Todo List:**
1. Create `docs/audius/` directory.
2. Write `AUDIT_REPORT.md` documenting:
   - Framework: Next.js 15, TypeScript strict, Supabase, pnpm.
   - Global player: `contexts/jukebox-context.tsx` (`JukeboxProvider`, `JukeboxTrack`), `components/jukebox/persistent-player-bar.tsx`, `components/jukebox/full-player-view.tsx`, `lib/services/jukebox.service.ts`.
   - Existing track model: `artist_music` table (UUID PKs, `user_id`, `file_url`, `storage_bucket/path`, `access_mode`, `is_public`, `rights_confirmed`).
   - Stream resolution: `app/api/music/stream/route.ts` (signs Supabase Storage URL, 3600s TTL).
   - Play analytics: `app/api/music/play/route.ts` → `music_plays` and `music_engagement_events` tables.
   - Artist music management: `app/artist/music/page.tsx` + `EnhancedMusicUploader` component.
   - Public surfaces: `components/public-artist/music/public-artist-music-section.tsx`, `components/profile/profile-music-showcase.tsx`.
   - Existing rate limiter: `lib/utils/rate-limit.ts` (Upstash-backed, `createRateLimiter`).
   - Auth/API helpers: `lib/api/route-helpers.ts` (`requireApiUser`, `jsonError`).
   - Feature flags: environment variables (`FEATURE_TICKETING_V2` pattern); no existing Audius flags.
   - No existing Audius code found anywhere in the codebase.
3. Write `ARCHITECTURE_DECISIONS.md` recording key decisions: use additive `music_provider_references` table, extend `JukeboxTrack` with optional `provider` and `provider_track_id` fields, keep `artist_music` as canonical record, resolve Audius stream server-side via new `/api/music/playback/resolve` endpoint.
4. Copy `docs/tourify-audius-integration-suite/implementation-progress.template.json` to `docs/audius/implementation-progress.json` and populate Phase 0 tasks with `in_progress`, adding discovered file targets.

**Relevant Context:**
- `docs/tourify-audius-integration-suite/00_MASTER_IMPLEMENTATION_ROADMAP.md` — required artifacts list.
- `docs/tourify-audius-integration-suite/13_CODEX_CURSOR_BUILD_AGENT_PROMPT.md` — audit checklist.
- `docs/tourify-audius-integration-suite/implementation-progress.template.json` — JSON template.

---

## Sub-Task 2 — Provider Contracts, Registry, and Feature Configuration (Phase 1)

**Status:** `[-] in_progress`

**Intent:**
Define the provider-neutral TypeScript contracts that form the integration seam, implement the provider registry, and add the Audius configuration/feature flag layer. No Audius API calls happen yet — just the contracts and the registry plumbing.

**Expected Outcomes:**
- `lib/music/providers/contracts.ts` exports `MusicProviderId`, `ProviderTrackReference`, `NormalizedTrack`, `PlaybackDescriptor`, `MusicProviderAdapter`, and related types.
- `lib/music/providers/registry.ts` exports `providerRegistry` with `register` / `get` / `list` helpers.
- `lib/music/providers/native-adapter.ts` wraps the existing `/api/music/stream` path behind the `MusicProviderAdapter` interface so native tracks compile through the new contracts.
- `lib/music/providers/audius/audius-config.ts` reads `AUDIUS_ENABLED`, `AUDIUS_API_BASE_URL`, `AUDIUS_APP_NAME`, `AUDIUS_REQUEST_TIMEOUT_MS`, `AUDIUS_METADATA_CACHE_TTL_SECONDS` from `process.env` (server-only).
- `JukeboxTrack` in `contexts/jukebox-context.tsx` gains two optional fields: `provider?: 'tourify' | 'audius'` and `provider_track_id?: string`. Existing code continues to compile unchanged.
- `.env.example` updated with Audius env var stubs.
- `docs/audius/implementation-progress.json` updated: Phase 1 tasks in progress/complete.

**Todo List:**
1. Create `lib/music/providers/contracts.ts` with the types from `docs/tourify-audius-integration-suite/02_ARCHITECTURE.md`. Reuse `MusicAccessLevel` from `lib/music/music-access.ts` rather than duplicating it.
2. Create `lib/music/providers/registry.ts` as a simple Map-backed registry keyed on `MusicProviderId`.
3. Create `lib/music/providers/native-adapter.ts` implementing `MusicProviderAdapter` for the `tourify` provider. Its `resolvePlayback` calls the existing `/api/music/stream` internal logic (or re-exports the helper from `lib/music/music-access.ts`). This adapter is registered on module load.
4. Create `lib/music/providers/audius/audius-config.ts` with typed `getAudiusConfig()` — throws at access time if `AUDIUS_ENABLED` is false, ensuring the adapter is gated.
5. Add `provider?: MusicProviderId` and `provider_track_id?: string` to `JukeboxTrack` interface in `contexts/jukebox-context.tsx`. Update `stripTrackForPersist` to include these fields. Add a guard in `isApiStreamPath` so Audius tracks (which won't use `/api/music/stream`) are not misidentified.
6. Append Audius env var stubs to `.env.example`.
7. Update `docs/audius/implementation-progress.json` Phase 1 tasks.

**Relevant Context:**
- `contexts/jukebox-context.tsx` — `JukeboxTrack` interface and `stripTrackForPersist`.
- `lib/music/music-access.ts` — `MusicAccessLevel` to reuse.
- `lib/api/route-helpers.ts` — existing patterns.
- `docs/tourify-audius-integration-suite/02_ARCHITECTURE.md` — contract types.

---

## Sub-Task 3 — Additive Supabase Migrations (Phase 2)

**Status:** `[ ] pending`

**Intent:**
Add the `music_provider_references` and `music_provider_imports` tables to the Supabase database using additive migrations only. Also add nullable provider columns to `music_engagement_events` for analytics. Regenerate TypeScript types.

**Expected Outcomes:**
- Migration `supabase/migrations/20260720000000_audius_provider_references.sql` applied cleanly.
- `music_provider_references` table exists with unique constraints `(provider, external_track_id)` and `(track_id, provider)`.
- `music_provider_imports` table exists.
- `music_engagement_events` gains nullable `provider`, `provider_track_id`, `playback_session_id`, `source_surface` columns.
- All new tables have RLS enabled with appropriate policies.
- Duplicate and orphan validation queries return 0 violations.
- `lib/database.types.ts` regenerated.
- Progress JSON updated.

**Todo List:**
1. Query live DB to confirm `artist_music` primary key type (UUID confirmed from migration source) and that `music_engagement_events` exists.
2. Write migration SQL per `docs/tourify-audius-integration-suite/03_DATABASE_AND_SUPABASE_MIGRATIONS.md`. Use `create table if not exists`, `alter table … add column if not exists`, `create index if not exists`. Foreign key from `music_provider_references.track_id` → `public.artist_music(id)`.
3. RLS on `music_provider_references`: authenticated owner can insert/update (via `track_id → artist_music.user_id = auth.uid()`), public read for publicly visible tracks, service role full access.
4. RLS on `music_provider_imports`: authenticated insert (own records), owner read, service role full access.
5. Apply via `mcp__supabase__apply_migration`.
6. Run validation queries from doc 03 to confirm no duplicates or orphans.
7. Regenerate types via `mcp__supabase__generate_typescript_types` and update `lib/database.types.ts`.
8. Run `mcp__supabase__get_advisors` for security review.
9. Update progress JSON.

**Relevant Context:**
- `docs/tourify-audius-integration-suite/03_DATABASE_AND_SUPABASE_MIGRATIONS.md` — SQL templates.
- `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` — existing pattern for RLS and indexes.
- `lib/music/music-access.ts` — `resolveMusicAccess` for ownership checks.

---

## Sub-Task 4 — Audius Provider Adapter (Phase 3)

**Status:** `[ ] pending`

**Intent:**
Implement the complete server-only Audius provider adapter that implements `MusicProviderAdapter`. This is the only place Audius API calls exist. No UI or player code calls Audius directly.

**Expected Outcomes:**
- `lib/music/providers/audius/audius-client.ts` — low-level HTTP client with AbortController, configurable timeout, bounded retry for idempotent GETs.
- `lib/music/providers/audius/audius-schemas.ts` — Zod schemas for Audius track, artist, and search response shapes.
- `lib/music/providers/audius/audius-mappers.ts` — maps Audius payloads to `NormalizedTrack`.
- `lib/music/providers/audius/audius-errors.ts` — maps Audius HTTP errors to Tourify error codes (`PROVIDER_UNAVAILABLE`, `PROVIDER_TIMEOUT`, `TRACK_NOT_FOUND`, etc.).
- `lib/music/providers/audius/audius-health.ts` — lightweight health check returning `healthy | degraded | unavailable`.
- `lib/music/providers/audius/audius-adapter.ts` — implements `MusicProviderAdapter`, registers with the registry, gated by `audius-config.ts`.
- Unit tests in `lib/music/providers/audius/__tests__/` using fixture JSON (no live network calls).
- Progress JSON updated.

**Todo List:**
1. Consult current Audius SDK/API docs for: discovery node endpoint, `/v1/tracks/search`, `/v1/tracks/{id}`, stream URL endpoint, app_name header, rate limits, attribution requirements.
2. Create `audius-config.ts` final version (if not done in Sub-Task 2).
3. Implement `audius-client.ts`: single `fetch` wrapper with `AbortController`, timeout via `setTimeout`+`abort`, 2-retry backoff for 429/503 on GET-only endpoints.
4. Implement `audius-schemas.ts` using Zod — parse and strip unknown fields. Handle missing `artwork`, `duration`, `artist`.
5. Implement `audius-mappers.ts`: map to `NormalizedTrack`, set `provider: 'audius'`, set `availability` based on parsed schema.
6. Implement `audius-errors.ts`: centralized error-code mapping function.
7. Implement `audius-health.ts`: single GET with short timeout, no side effects.
8. Implement `audius-adapter.ts`: `searchTracks`, `getTrack`, `resolvePlayback`, `getArtist`, `healthCheck`. `resolvePlayback` returns `PlaybackDescriptor` with Audius stream URL — never stores it.
9. Write fixture-based tests for mapper edge cases (missing artwork, zero duration, unavailable track) and error mapping.
10. Register `AudiusProvider` in the registry in `audius-adapter.ts` module level (gated on `AUDIUS_ENABLED`).
11. Update progress JSON.

**Relevant Context:**
- `lib/music/providers/contracts.ts` (from Sub-Task 2).
- `lib/music/providers/registry.ts` (from Sub-Task 2).
- `lib/music/providers/audius/audius-config.ts` (from Sub-Task 2).
- `lib/utils/rate-limit.ts` — rate limiter pattern.
- `docs/tourify-audius-integration-suite/05_AUDIUS_PROVIDER_ADAPTER.md`.

---

## Sub-Task 5 — Backend API Routes (Phase 4)

**Status:** `[ ] pending`

**Intent:**
Add server-side API routes for Audius search, track metadata, import/link, playback resolution, and analytics. These routes consume the adapter and provider registry; clients never touch Audius directly.

**Expected Outcomes:**
- `app/api/music/providers/audius/search/route.ts` — GET, auth optional, rate-limited, feature-gated, returns `NormalizedTrack[]`.
- `app/api/music/providers/audius/tracks/[trackId]/route.ts` — GET, returns normalized metadata + attribution.
- `app/api/music/import/route.ts` — POST, authenticated, authorized, idempotent, creates `artist_music` row + `music_provider_references` row + `music_provider_imports` row in a transaction.
- `app/api/music/playback/resolve/route.ts` — POST, authenticated, returns `PlaybackDescriptor` with `Cache-Control: private, no-store`. Never stores the stream URL.
- Play/event analytics extended in existing `app/api/music/play/route.ts` to accept optional `provider` and `playback_session_id` fields.
- All routes use `requireApiUser`, `jsonError`, `readJson`, Zod validation, `createRateLimiter`.
- Progress JSON updated.

**Todo List:**
1. Create `app/api/music/providers/audius/search/route.ts`: validate `q` (2–200 chars), `limit` (1–50), check `AUDIUS_ENABLED`, apply rate limiter (`audius:search` namespace), call `AudiusAdapter.searchTracks`, return normalized array.
2. Create `app/api/music/providers/audius/tracks/[trackId]/route.ts`: validate `trackId` not empty, check flag, call `AudiusAdapter.getTrack`, return normalized + attribution.
3. Create `app/api/music/import/route.ts`: authenticate user, validate body (`provider`, `externalTrackId`, `artistProfileId?`, `sourceSurface?`), call adapter for fresh metadata, check `music_provider_references` for existing reference (idempotent), create `artist_music` row with `provider: 'audius'` in metadata and appropriate defaults, create `music_provider_references` row, create `music_provider_imports` audit row, return canonical `artist_music` record.
4. Create `app/api/music/playback/resolve/route.ts`: authenticate, validate body (`trackId`, `playbackSessionId`, `sourceSurface?`), fetch `artist_music` + `music_provider_references`, call registry `resolvePlayback`, return `PlaybackDescriptor`, set `Cache-Control: private, no-store`. Reject if `AUDIUS_ENABLED=false`.
5. Extend `app/api/music/play/route.ts` POST to optionally accept `provider` and `playback_session_id` fields and pass them to `recordMusicEvent` in the `metadata` field (additive; existing behavior unchanged).
6. Write integration-style tests (or at minimum stub tests) for import idempotency and unauthorized access.
7. Update progress JSON.

**Relevant Context:**
- `lib/api/route-helpers.ts` — `requireApiUser`, `jsonError`, `readJson`.
- `lib/utils/rate-limit.ts` — `createRateLimiter`.
- `app/api/music/stream/route.ts` — existing stream pattern to mirror for playback resolve.
- `app/api/artist/music/route.ts` — import route follows same auth pattern.
- `lib/music/music-access.ts` — `getTrustedMusicWriteClient`, `recordMusicEvent`.
- `docs/tourify-audius-integration-suite/04_BACKEND_APIS.md`.

---

## Sub-Task 6 — Jukebox Player Compatibility Refactor (Phase 5)

**Status:** `[ ] pending`

**Intent:**
Extend the Jukebox player so that tracks with `provider === 'audius'` are resolved through `/api/music/playback/resolve` instead of `/api/music/stream`. Native tracks remain 100% unchanged. The refactor is minimal and surgical.

**Expected Outcomes:**
- `contexts/jukebox-context.tsx` `resolveStreamUrl` branches on `track.provider`: native → existing `/api/music/stream`, audius → new `/api/music/playback/resolve`.
- A `playbackSessionId` is generated (UUID) when a track becomes current and is used in the resolve call.
- `stripTrackForPersist` does NOT persist the resolved URL; Audius tracks persist with `provider` and `provider_track_id` only (no `file_url` leakage).
- `isApiStreamPath` updated so Audius tracks (no `/api/music/stream` path) are correctly identified as needing re-resolution on resume.
- Existing native playback behavior passes unchanged.
- Progress JSON updated.

**Todo List:**
1. Update `resolveStreamUrl` in `contexts/jukebox-context.tsx` to branch on `track.provider === 'audius'`, calling `POST /api/music/playback/resolve` with `{ trackId, playbackSessionId, sourceSurface }`.
2. Generate a `playbackSessionId` (`crypto.randomUUID()`) when `SET_TRACK` is dispatched; store in a ref. Pass to `resolveStreamUrl`.
3. Add `playbackSessionId` to the `playTrack` closure so it's included in the resolve call.
4. Update `isApiStreamPath` to return `true` for Audius tracks lacking a real URL (so resume re-resolves rather than reusing stale state).
5. Update `stripTrackForPersist`: for Audius tracks, set `file_url` to empty string (not the resolved URL). On session restore, the player will re-resolve on play.
6. Update `recordPlay` to pass `provider` to `/api/music/play`.
7. Manually verify: play a native track → unaffected. Play an Audius track → correct branch.
8. Update progress JSON.

**Relevant Context:**
- `contexts/jukebox-context.tsx` — `resolveStreamUrl`, `playTrack`, `stripTrackForPersist`, `isApiStreamPath`.
- Sub-Task 5's `app/api/music/playback/resolve/route.ts`.
- `docs/tourify-audius-integration-suite/06_GLOBAL_PLAYER_REFACTOR.md`.

---

## Sub-Task 7 — Frontend UI: Artist Music Manager + Audius Import Modal (Phase 6, part A)

**Status:** `[ ] pending`

**Intent:**
Add an Audius search/import UI within the existing artist music management page (`app/artist/music/page.tsx`). Artists can search Audius and add tracks to their profile. This surface is gated by `NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED`.

**Expected Outcomes:**
- New component `components/music/audius-import-modal.tsx` implements the search/import modal with states: empty, searching, results, no-results, provider-unavailable, importing, already-imported, and error.
- Each search result shows: artwork, title, artist name, duration, Audius provider badge, "Add to Profile" / "Already Added" button.
- `app/artist/music/page.tsx` gains an "Add from Audius" button (hidden when `NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED !== 'true'`).
- Duplicate detection: if `music_provider_references` already has a row for `(audius, externalTrackId)` for this artist, show "Already added".
- Accessible: keyboard-navigable results, ARIA live regions for search status and import state.
- Progress JSON updated.

**Todo List:**
1. Create `components/music/audius-import-modal.tsx`:
   - Debounced search input (300ms) calling `GET /api/music/providers/audius/search`.
   - Result list rendered as `<ul>` with `role="listbox"` for keyboard nav.
   - Each item: `<AudiusTrackRow>` sub-component with artwork (fallback icon), title, artist, duration, provider badge, action button.
   - Import button calls `POST /api/music/import`. On success dispatches an `onImportComplete(canonicalTrack)` callback.
   - All error states show user-friendly messages per `docs/tourify-audius-integration-suite/07_FRONTEND_UI_INTEGRATION.md`.
2. Add `NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED` check at the button render site in `app/artist/music/page.tsx`.
3. Wire the modal open/close state. On `onImportComplete`, refresh the track list (re-fetch artist tracks).
4. Add provider badge component (reusable): `components/music/provider-badge.tsx` — shows "Audius" label with logo/icon if available.
5. Update progress JSON.

**Relevant Context:**
- `app/artist/music/page.tsx` — existing upload button patterns to follow for the "Add from Audius" button.
- `components/music/enhanced-music-uploader.tsx` — existing modal/dialog patterns.
- `docs/tourify-audius-integration-suite/07_FRONTEND_UI_INTEGRATION.md` — required modal states.

---

## Sub-Task 8 — Frontend UI: Public Profile Playback + Track Card Attribution (Phase 6, part B)

**Status:** `[ ] pending`

**Intent:**
Display Audius-linked tracks on the artist's public profile. Track cards show the Audius attribution badge and external link. Listeners can play them through the existing Jukebox player. Gated by `NEXT_PUBLIC_AUDIUS_PROFILE_PLAYBACK_ENABLED`.

**Expected Outcomes:**
- `components/public-artist/music/public-artist-music-section.tsx` and `components/profile/profile-music-showcase.tsx` can display tracks that have `provider === 'audius'` in their metadata (sourced from `artist_music.metadata`).
- Provider badge and Audius canonical URL link (`external_url` from `music_provider_references.metadata`) appear on Audius track cards.
- "Play" action calls existing `jukebox.play()` with the `JukeboxTrack` extended by `provider: 'audius'` and `provider_track_id`.
- When `NEXT_PUBLIC_AUDIUS_PROFILE_PLAYBACK_ENABLED !== 'true'`, Audius tracks are hidden from the public view gracefully (not errored).
- Tracks that become unavailable (Audius returns 404) show a non-blocking unavailable state, not a broken player.
- Progress JSON updated.

**Todo List:**
1. Extend `lib/services/jukebox.service.ts` `feedTrackToJukeboxTrack` and related mappers to pass through `provider` and `provider_track_id` from `artist_music.metadata` when present.
2. Update `components/public-artist/music/public-artist-music-section.tsx` to render `ProviderBadge` for Audius tracks and an external Audius link icon.
3. Add feature-flag check in the section that hides Audius tracks when the flag is off.
4. Handle `TRACK_UNAVAILABLE` error state in the player bar when an Audius track's resolution fails — show a "Track unavailable" message with skip action, do not break the queue.
5. Update progress JSON.

**Relevant Context:**
- `components/public-artist/music/public-artist-music-section.tsx` — public track list.
- `lib/services/jukebox.service.ts` — `feedTrackToJukeboxTrack` mapper.
- `components/jukebox/persistent-player-bar.tsx` — error display (`state.playbackError`).
- `contexts/jukebox-context.tsx` — `SET_PLAYBACK_ERROR` action.

---

## Sub-Task 9 — Analytics Integration and Progress JSON Completion (Phase 7)

**Status:** `[ ] pending`

**Intent:**
Extend existing analytics events to include provider-aware properties. No new analytics tables — provider context flows through existing `music_engagement_events` columns added in Sub-Task 3.

**Expected Outcomes:**
- `app/api/music/play/route.ts` propagates `provider`, `provider_track_id`, `playback_session_id`, and `source_surface` from request body into the `metadata` column of `music_engagement_events`.
- `contexts/jukebox-context.tsx` `recordPlay` sends these fields when `provider === 'audius'`.
- `app/api/music/import/route.ts` records an import event (`music_provider_track_imported`) in `music_engagement_events`.
- `app/api/music/providers/audius/search/route.ts` records search events (`music_provider_search_completed`/`_failed`) server-side.
- No temporary stream URLs appear in any event payload.
- `docs/audius/implementation-progress.json` Phase 7 tasks marked complete.

**Todo List:**
1. Update `recordMusicEvent` calls in `app/api/music/play/route.ts` to merge `provider`, `provider_track_id`, `playback_session_id`, `source_surface` from request body into the `metadata` JSONB (additive — existing events are unchanged).
2. Update `contexts/jukebox-context.tsx` `recordPlay` callback to include `provider` and `playbackSessionId` fields in the POST body.
3. Add search event logging in `app/api/music/providers/audius/search/route.ts` (fire-and-forget, using `recordMusicEvent` or a lightweight insert).
4. Add import event in `app/api/music/import/route.ts` (already partially done in Sub-Task 5).
5. Verify no URL fields contain stream URLs in any logged event.
6. Mark Phase 7 complete in progress JSON.

**Relevant Context:**
- `app/api/music/play/route.ts` — existing `recordMusicEvent` usage.
- `lib/music/music-access.ts` — `recordMusicEvent` signature.
- `docs/tourify-audius-integration-suite/08_ANALYTICS_AND_TELEMETRY.md`.

---

## Sub-Task 10 — Final Documentation and Rollout Artifacts

**Status:** `[ ] pending`

**Intent:**
Produce the required final report, update the progress JSON to fully complete, and document the rollout/rollback procedure. This closes the Definition of Done from `docs/tourify-audius-integration-suite/12_DEFINITION_OF_DONE.md`.

**Expected Outcomes:**
- `docs/audius/FINAL_IMPLEMENTATION_REPORT.md` exists with all required sections.
- `docs/audius/implementation-progress.json` shows `overallStatus: "complete"` with all phases done.
- Rollback procedure documented: set `AUDIUS_ENABLED=false` and `NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED=false` + `NEXT_PUBLIC_AUDIUS_PROFILE_PLAYBACK_ENABLED=false` → all Audius surfaces disappear; native playback unaffected; imported records preserved.

**Todo List:**
1. Write `docs/audius/FINAL_IMPLEMENTATION_REPORT.md` covering: audit summary, architecture, migrations, changed-file inventory, test results, rollout/rollback instructions, security notes, known limitations.
2. Mark all Phase 8 tasks in progress JSON complete.
3. Set `overallStatus: "complete"` and record `lastUpdated`.
4. Run `mcp__supabase__get_advisors` final security pass.

**Relevant Context:**
- `docs/tourify-audius-integration-suite/12_DEFINITION_OF_DONE.md`.
- `docs/tourify-audius-integration-suite/11_ROLLOUT_PLAN.md`.
- `docs/tourify-audius-integration-suite/13_CODEX_CURSOR_BUILD_AGENT_PROMPT.md` — final report requirements.

---

## Architecture at a Glance

```
Browser (JukeboxContext)
  │
  ├─ native track ──▶  /api/music/stream  ──▶  Supabase Storage (signed URL)
  │
  └─ audius track ──▶  /api/music/playback/resolve
                              │
                         audius-adapter.ts
                              │
                         Audius Discovery Node API
```

**New files to be created:**
- `lib/music/providers/contracts.ts`
- `lib/music/providers/registry.ts`
- `lib/music/providers/native-adapter.ts`
- `lib/music/providers/audius/audius-adapter.ts`
- `lib/music/providers/audius/audius-client.ts`
- `lib/music/providers/audius/audius-config.ts`
- `lib/music/providers/audius/audius-errors.ts`
- `lib/music/providers/audius/audius-health.ts`
- `lib/music/providers/audius/audius-mappers.ts`
- `lib/music/providers/audius/audius-schemas.ts`
- `lib/music/providers/audius/__tests__/` (fixture-based tests)
- `app/api/music/providers/audius/search/route.ts`
- `app/api/music/providers/audius/tracks/[trackId]/route.ts`
- `app/api/music/import/route.ts`
- `app/api/music/playback/resolve/route.ts`
- `components/music/audius-import-modal.tsx`
- `components/music/provider-badge.tsx`
- `supabase/migrations/20260720000000_audius_provider_references.sql`
- `docs/audius/AUDIT_REPORT.md`
- `docs/audius/ARCHITECTURE_DECISIONS.md`
- `docs/audius/implementation-progress.json`
- `docs/audius/FINAL_IMPLEMENTATION_REPORT.md`

**Modified files:**
- `contexts/jukebox-context.tsx` (extend `JukeboxTrack`, branch `resolveStreamUrl`)
- `lib/services/jukebox.service.ts` (pass through provider fields in mappers)
- `app/api/music/play/route.ts` (add provider analytics props)
- `app/artist/music/page.tsx` (add "Add from Audius" button)
- `components/public-artist/music/public-artist-music-section.tsx` (provider badge, flag gate)
- `.env.example` (Audius env var stubs)
- `lib/database.types.ts` (regenerated)
