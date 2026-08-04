# Tourify × Audius Integration — Architecture Decisions

**Date:** 2025-07-20  
**Status:** Approved — implementation may proceed

---

## AD-001 — Use additive `music_provider_references` table (not new provider columns on `artist_music`)

**Decision:** Add a separate `music_provider_references` table linked to `artist_music.id` via foreign key.

**Rationale:**
- `artist_music` is a large, well-established table with many existing queries. Adding provider-specific nullable columns risks confusing future readers.
- A separate reference table keeps provider identity separate from canonical track identity.
- Future providers (SoundCloud, Spotify, etc.) can use the same reference table without schema changes.
- Existing queries on `artist_music` remain fast and unmodified.

**Rejected alternative:** Adding `provider`, `external_track_id`, `external_artist_id` directly to `artist_music` — too invasive for a first-release feature.

---

## AD-002 — `artist_music` is still created for Audius imports

**Decision:** When an Audius track is imported, a new `artist_music` row is created as the canonical Tourify record. The Audius identity lives in `music_provider_references`.

**Rationale:**
- All downstream systems (player, playlist, library, analytics, profiles) consume `artist_music` rows. Adding an Audius import that does _not_ create an `artist_music` row would require touching every downstream consumer.
- The Tourify artist retains full control over the track's metadata, visibility, and access policy within their profile.
- Provider-specific fields (external ID, canonical URL, artwork) are stored in `music_provider_references.metadata`.

**Consequence:** The import route must be idempotent — a second import of the same `(provider, external_track_id)` must return the existing `artist_music` record, not create a duplicate.

---

## AD-003 — Extend `JukeboxTrack` with optional `provider` and `provider_track_id` fields

**Decision:** Add `provider?: 'tourify' | 'audius'` and `provider_track_id?: string` as optional fields on the existing `JukeboxTrack` interface.

**Rationale:**
- Keeps the single integration point (`contexts/jukebox-context.tsx`) clean. No second track type.
- Optional fields mean all existing code compiles without modification.
- `resolveStreamUrl` branches on `track.provider === 'audius'`, keeping the native path identical to current behavior.

**Rejected alternative:** A union type `NativeJukeboxTrack | AudiusJukeboxTrack` — over-engineering for initial release; discriminated unions can be added later if complexity warrants.

---

## AD-004 — Playback resolution is server-side only; browser never calls Audius directly

**Decision:** The new `POST /api/music/playback/resolve` route calls the Audius adapter server-side and returns a `PlaybackDescriptor` to the browser. The browser uses the resolved `sourceUrl` to load audio.

**Rationale:**
- Temporary stream URLs from Audius must not be persisted or logged (per spec).
- Keeping Audius API calls server-side prevents leaking configuration and allows rate-limit enforcement.
- `Cache-Control: private, no-store` on the resolve response ensures the URL is not cached at any intermediate layer.

**Consequence:** Every play of an Audius track incurs a round-trip to `/api/music/playback/resolve`. This is acceptable because the Audius stream URL is temporary and must be fresh. Resolved URL is held only in the browser's in-memory `audio.src`.

---

## AD-005 — Feature flags are env-var-based for initial rollout

**Decision:** Use three environment variables:
- `AUDIUS_ENABLED` — server-side kill switch for all Audius adapter calls
- `NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED` — shows/hides "Add from Audius" button in artist manager
- `NEXT_PUBLIC_AUDIUS_PROFILE_PLAYBACK_ENABLED` — shows/hides Audius tracks on public profiles

**Rationale:**
- The `feature_flags` table and admin registry exist but are scoped to admin/ticketing features. Per the implementation decision, env vars are sufficient for initial rollout.
- Env vars are immediately deployable without a UI and match the existing `FEATURE_TICKETING_V2` pattern.
- Migration to DB-backed cohort flags is straightforward if needed later.

---

## AD-006 — Audius discovery node default; configurable via env

**Decision:** Default `AUDIUS_API_BASE_URL` to `https://discoveryprovider.audius.co`. Overridable via environment variable.

**Rationale:**
- `discoveryprovider.audius.co` is Audius's documented stable entry point that load-balances across discovery nodes.
- Making it configurable allows switching to a different node if needed without code changes.
- The adapter does NOT implement dynamic discovery node selection at this stage — that is over-engineering for initial release.

---

## AD-007 — Audius tracks appear inline in the artist's track list (no separate section)

**Decision:** Per product decision, imported Audius tracks appear in the same list as uploaded tracks in both the artist management page and public profile, distinguished only by a provider badge.

**Rationale:**
- Consistent UX — listeners should not need to understand provider distinctions.
- Simplifies the data flow: all tracks go through the same `artist_music` query.
- The provider badge provides attribution without structural separation.

---

## AD-008 — `stripTrackForPersist` never stores a resolved Audius stream URL

**Decision:** In `stripTrackForPersist`, Audius tracks have their `file_url` set to an empty string. On session restore, a `provider: 'audius'` track without a resolved URL will re-resolve on play via `/api/music/playback/resolve`.

**Rationale:**
- Audius stream URLs are temporary and must not be persisted (per spec, per security requirements).
- `isApiStreamPath` is updated to return `true` for Audius tracks with empty/null `file_url`, ensuring the player re-resolves on resume rather than attempting to play a stale URL.

---

## Summary Table

| ID | Decision | Key Trade-off |
|----|----------|---------------|
| AD-001 | Separate `music_provider_references` table | Future-proof vs. simpler direct columns |
| AD-002 | `artist_music` row created on import | All downstream systems unchanged vs. heavier import |
| AD-003 | Extend `JukeboxTrack` (optional fields) | Minimal change vs. type safety of union |
| AD-004 | Server-side playback resolution only | Security/compliance vs. extra round-trip per play |
| AD-005 | Env-var feature flags | Speed vs. cohort targeting (upgrade path exists) |
| AD-006 | Discovery node default | Simplicity vs. dynamic node selection |
| AD-007 | Inline track list display | UX simplicity vs. provider separation |
| AD-008 | No persisted stream URLs | Security compliance vs. faster session restore |
