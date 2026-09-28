# Tourify × Audius Integration — Audit Report

**Audit Date:** 2025-07-20  
**Branch:** main  
**Commit:** 76d8389ebf939cee70f7070abf74a6bacc46f5de  
**Auditor:** Build agent (automated audit)  
**Status:** Phase 0 complete — implementation may begin

---

## 1. Repository Architecture

| Attribute | Value |
|-----------|-------|
| Framework | Next.js 15 (App Router) with Turbopack |
| Language | TypeScript (strict) |
| Package manager | npm 11.5.2 |
| Node version | 20.x |
| Database | Supabase (PostgreSQL) |
| Mobile | Expo (React Native) in `apps/mobile/` |
| Runtime validation | Zod (used in many existing routes) |
| Linting | ESLint (`eslint.config.mjs`) |
| Testing | Vitest + Jest + Playwright |
| CI | GitHub Actions (`.github/`) |
| Deployment | Vercel (`vercel.json`) |

---

## 2. Global Music Player — Confirmed File Targets

### Primary player
- **`contexts/jukebox-context.tsx`** — `JukeboxProvider`, `JukeboxTrack`, `JukeboxState`, all player actions. This is the single source of truth for playback state.
- **`components/jukebox/persistent-player-bar.tsx`** — Bottom player chrome; reads from `useJukeboxOptional()`.
- **`components/jukebox/full-player-view.tsx`** — Expanded player modal.
- **`components/jukebox/player-actions.tsx`** — Social actions (like, library add) within the player.
- **`components/jukebox/track-cover-image.tsx`** — Cover art display with fallback.
- **`components/jukebox/track-card.tsx`** — Track card used in expanded view.
- **`components/jukebox/album-art-visual.tsx`** — Animated art visual.
- **`components/jukebox/visualizers.tsx`** — Audio visualizer.
- **`components/jukebox/theme-selector.tsx`** — Theme picker.
- **`components/dashboard/jukebox-player.tsx`** — Dashboard wrapper for the player.
- **`lib/services/jukebox.service.ts`** — Service functions for track fetching, playlist management, library, likes, shares.
- **`lib/jukebox/visual-themes.ts`** — Theme definitions.
- **`lib/jukebox/track-social-cache.ts`** — Client-side social state cache.

### Mobile player
- **`apps/mobile/providers/music-player-provider.tsx`** — Mobile player provider.
- **`apps/mobile/components/music/mini-player.tsx`** — Mobile mini-player.

### Feed integration
- **`components/feed/feed-music-player.tsx`** — Music player embedded in feed cards.

### Public surfaces
- **`components/public-artist/music/public-artist-music-section.tsx`** — Artist public profile music section. Contains `dtoToJukeboxTrack` mapper.
- **`components/profile/profile-music-showcase.tsx`** — Profile page music showcase.
- **`components/profile/profile-jukebox-widget.tsx`** — Jukebox widget on profiles.

---

## 3. `JukeboxTrack` Interface (Current)

```ts
// contexts/jukebox-context.tsx
export interface JukeboxTrack {
  id: string            // artist_music.id (UUID)
  title: string
  artist_name: string
  artist_id?: string
  artist_avatar_url?: string
  duration?: number     // seconds
  file_url: string      // stream path or direct URL
  cover_art_url?: string
  genre?: string
  tags?: string[]
  is_public?: boolean
  listing_id?: string | null
  allow_downloads?: boolean
  allow_library_add?: boolean
  access_mode?: "free" | "paid"
  in_library?: boolean
}
```

**Required extension** for Audius: add `provider?: 'tourify' | 'audius'` and `provider_track_id?: string` as optional fields. Both fields default to undefined (backward-compatible).

---

## 4. Stream Resolution (Current)

### `resolveStreamUrl` in `JukeboxProvider`
1. Calls `GET /api/music/stream?trackId={id}` with credentials.
2. Receives `{ url, accessLevel, expiresIn }`.
3. Sets `audio.src` to the signed Supabase Storage URL.

### `app/api/music/stream/route.ts`
- Queries `artist_music` by `trackId`.
- Calls `resolveMusicAccess` (checks ownership, public visibility, library entitlement).
- Calls `supabase.storage.from(bucket).createSignedUrl(storagePath, 3600)`.
- Returns `{ url, accessLevel, expiresIn: 3600 }` with `Cache-Control: private, max-age=3000`.
- Writes `stream_issued` event to `music_engagement_events`.

**For Audius:** a new `/api/music/playback/resolve` endpoint will parallel this. It calls `AudiusProvider.resolvePlayback()` and returns a short-lived `PlaybackDescriptor` with `Cache-Control: private, no-store`.

---

## 5. Artist Track Management — Confirmed File Targets

| File | Role |
|------|------|
| `app/artist/music/page.tsx` | Artist music management page — main canvas |
| `components/music/enhanced-music-uploader.tsx` | Upload modal component |
| `app/api/artist/music/route.ts` | GET/POST/PATCH/DELETE artist tracks |
| `app/api/artist/music/upload-url/route.ts` | Signed upload URL |
| `app/api/music/stream/route.ts` | Stream URL resolver |
| `app/api/music/play/route.ts` | Play recording + analytics |
| `app/api/music/import/route.ts` | *(new)* Audius import |
| `app/api/music/playback/resolve/route.ts` | *(new)* Provider-agnostic playback resolution |
| `app/api/music/providers/audius/search/route.ts` | *(new)* Audius search proxy |
| `app/api/music/providers/audius/tracks/[trackId]/route.ts` | *(new)* Audius track metadata |

---

## 6. Database — Canonical Music Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `artist_music` | Canonical track store (1 row per track regardless of provider) | `id UUID`, `user_id`, `artist_profile_id`, `file_url`, `storage_bucket/path`, `access_mode`, `is_public`, `rights_confirmed`, `metadata JSONB`, `stats JSONB` |
| `music_plays` | Play count records | `music_id`, `user_id`, `access_level`, `completed`, `listen_seconds` |
| `music_engagement_events` | Analytics events | `music_id`, `event_type` (enum), `source`, `metadata JSONB` |
| `user_music_library` | User library / purchases | `buyer_user_id`, `music_track_id` |
| `music_playlists` | Playlists | `owner_user_id`, `visibility` |
| `music_playlist_items` | Playlist contents | `playlist_id`, `music_track_id` |
| `user_profile_featured_tracks` | Profile featured track | `user_id`, `music_track_id` |
| `music_likes` | Likes | `music_id`, `user_id` |
| `feature_flags` | DB-backed feature flags | `key`, `enabled`, etc. |

**New tables to add (Phase 2):**
- `music_provider_references` — links `artist_music` rows to external provider IDs.
- `music_provider_imports` — audit trail of import actions.

---

## 7. Authentication & API Patterns

- **`lib/api/route-helpers.ts`** — `requireApiUser(request)`, `jsonError()`, `readJson(request, schema)`.
- **`lib/auth/api-auth.ts`** — `authenticateApiRequest()`.
- **`lib/utils/rate-limit.ts`** — `createRateLimiter({ namespace, limit, windowSec })` backed by Upstash Redis (falls back gracefully if not configured).
- **`lib/music/music-access.ts`** — `resolveMusicAccess()`, `getTrustedMusicWriteClient()`, `recordMusicEvent()`.

---

## 8. Feature Flag System

- **DB-backed:** `feature_flags` table (16 existing rows). Used via Supabase queries.
- **Env-var-backed:** `FEATURE_TICKETING_V2=false` pattern in `.env.example`. Per user decision, Audius will use env vars only for initial rollout.
- **Admin registry:** `lib/admin/feature-flags/registry.ts` — typed versioned flags for admin-controlled rollout. Not used for Audius in first release.

---

## 9. Existing Audius Code

**None found.** A comprehensive grep across all `.ts` and `.tsx` files for `audius` returned zero matches. This is a greenfield integration.

---

## 10. Pre-existing Baseline Check

| Check | Status |
|-------|--------|
| `artist_music` RLS enabled | ✅ Confirmed |
| `music_plays` RLS enabled | ✅ Confirmed |
| `music_engagement_events` RLS enabled | ✅ Confirmed |
| `feature_flags` table exists | ✅ Confirmed (16 rows) |
| No existing Audius code | ✅ Confirmed |
| No `music_provider_references` table | ✅ Confirmed — to be created in Phase 2 |
| `JukeboxTrack` `id` matches `artist_music.id` | ✅ Confirmed (both UUID) |
| Stream route returns no persisted URL | ✅ Returns signed URL, not stored in DB |

---

## 11. Identified Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Audius discovery node availability | AbortController timeout, bounded retry, `AUDIUS_ENABLED` flag kill switch |
| Stale resolution on rapid track switching | `playGenerationRef` pattern already in `JukeboxProvider` — extend to cover Audius branch |
| Duplicate `artist_music` rows on re-import | Unique constraint on `(provider, external_track_id)` in `music_provider_references`; import route checks before inserting |
| Temporary stream URL leakage | `Cache-Control: private, no-store` on resolve endpoint; `stripTrackForPersist` never persists resolved URL |
| Cross-account track attachment | `requireApiUser` + ownership check against `artist_profiles.user_id` in import route |
| Native playback regression | Audius branch in `resolveStreamUrl` is guarded by `track.provider === 'audius'`; native path unchanged |

---

## 12. Phase 0 Acceptance Criteria

- [x] Existing music/player/UI/analytics architecture documented.
- [x] Reused components and deliberate extension points identified.
- [x] No existing Audius code found.
- [x] Canonical track table and existing integration patterns confirmed.
- [x] Pre-existing baseline checks recorded.
- [x] No implementation code changed.
