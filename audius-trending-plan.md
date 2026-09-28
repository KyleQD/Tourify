# Audius Trending Tracks — Implementation Plan

## Overview

Replace the placeholder `q=popular` search that currently populates the Audius tab in `/music` with real weekly trending data from the Audius `/v1/tracks/trending?time=week` endpoint. The page already has the full render pipeline; this is a focused plumbing change: one new API route, a thin adapter method, a Zod schema alias, and a one-line swap in the page component.

**Scope:** 4 files changed, 1 new file created. No DB changes. No new env vars.

**Non-goals:** Trending genre filtering, infinite scroll, "all time" / "month" toggle (can be added later as the UI scaffold will make it easy).

---

## Sub-Task 1 — Trending Response Schema

**Status:** `[ ] pending`

**Intent:**
The Audius `/v1/tracks/trending` endpoint returns `{ data: AudiusTrack[] }` — the exact same shape as the search response. We just need a named export alias so code is self-documenting.

**Expected Outcomes:**
- `AudiusTrendingResponseSchema` exported from `audius-schemas.ts`
- `AudiusTrendingResponse` TypeScript type exported
- No existing schema changed

**Todo List:**
1. Open `lib/music/providers/audius/audius-schemas.ts`
2. Below the `AudiusSearchResponseSchema` block, add:
   ```ts
   export const AudiusTrendingResponseSchema = AudiusSearchResponseSchema
   export type AudiusTrendingResponse = AudiusSearchResponse
   ```

**Relevant Context:**
- `lib/music/providers/audius/audius-schemas.ts` — existing schemas
- Audius API: `GET /v1/tracks/trending?time=week&app_name=Tourify` returns `{ data: AudiusTrack[] }`

---

## Sub-Task 2 — Adapter Method: `getTrending`

**Status:** `[x] done`

**Intent:**
Add a `getTrending` method to `AudiusProviderAdapter` that calls `/v1/tracks/trending` with a `time` parameter. This keeps all Audius API calls inside the adapter layer — UI and route code never call Audius directly.

**Expected Outcomes:**
- `AudiusProviderAdapter` has a `getTrending(time?: 'week' | 'month' | 'allTime')` method returning `Promise<NormalizedTrack[]>`
- Method is gated by `assertEnabled()` like all other adapter methods
- Method reuses `audiusGet`, `AudiusTrendingResponseSchema`, and `mapAudiusTrackToNormalized`
- `limit` is hardcoded to 20 (Audius trending always returns 100 max; we take the top slice)
- The `MusicProviderAdapter` interface in `contracts.ts` does NOT need changing — `getTrending` is an Audius-specific extension, not a provider-neutral contract

**Todo List:**
1. Open `lib/music/providers/audius/audius-adapter.ts`
2. Add import for `AudiusTrendingResponseSchema` from `./audius-schemas`
3. Add `getTrending` method to the `AudiusProviderAdapter` class:
   - Call `audiusGet("/v1/tracks/trending", { time: time ?? "week" }, { config })`
   - Parse with `AudiusTrendingResponseSchema.safeParse(raw)`
   - Map each track with `mapAudiusTrackToNormalized`
   - Return first 20 results (`.slice(0, 20)`)
   - Throw `audiusSchemaError` on parse failure
4. Export `audiusAdapter` already exports the singleton — no change needed to export

**Relevant Context:**
- `lib/music/providers/audius/audius-adapter.ts` — existing adapter; `searchTracks` method is the closest pattern to follow
- `lib/music/providers/audius/audius-client.ts` — `audiusGet` function signature
- `lib/music/providers/audius/audius-mappers.ts` — `mapAudiusTrackToNormalized`

---

## Sub-Task 3 — Backend API Route: `/api/music/providers/audius/trending`

**Status:** `[ ] pending`

**Intent:**
Expose a server-side route that the `/music` page fetches. This follows the exact same pattern as the existing `/api/music/providers/audius/search/route.ts` — feature-gated, rate-limited, returns `NormalizedTrack[]`.

**Expected Outcomes:**
- `app/api/music/providers/audius/trending/route.ts` created
- `GET /api/music/providers/audius/trending?time=week` returns `{ data: NormalizedTrack[], error: null }`
- `time` param is validated: must be `week | month | allTime`, defaults to `week`
- Rate-limited under the `audius:trending` namespace (30 req / 60s per IP)
- Feature-gated: returns 403 if `AUDIUS_ENABLED=false`
- No authentication required (trending is public)
- Fires analytics event to `music_engagement_events` (fire-and-forget, same pattern as search route)

**Todo List:**
1. Create `app/api/music/providers/audius/trending/route.ts`
2. Copy structure from `app/api/music/providers/audius/search/route.ts`
3. Replace search logic with:
   - Parse `time` query param; validate against `['week', 'month', 'allTime']`, default to `'week'`
   - Call `audiusAdapter.getTrending(time)`
   - Return `{ data: tracks, meta: { time, total: tracks.length }, error: null }`
4. Change analytics event `event_label` to `"music_provider_trending_fetched"` and include `time_range: time` in metadata
5. Keep `export const dynamic = "force-dynamic"`

**Relevant Context:**
- `app/api/music/providers/audius/search/route.ts` — template to follow exactly
- `lib/api/route-helpers.ts` — `jsonError`
- `lib/utils/rate-limit.ts` — `createRateLimiter`

---

## Sub-Task 4 — Page Component: Swap Placeholder for Real Trending Endpoint

**Status:** `[ ] pending`

**Intent:**
Replace the single `fetch` call in `AudiusSection`'s mount effect that hits `search?q=popular` with the new `/api/music/providers/audius/trending?time=week` endpoint. Also update the section header label from "Featured on Audius" to "Trending on Audius this week".

**Expected Outcomes:**
- On Audius tab mount, the page fetches `/api/music/providers/audius/trending?time=week`
- Section header reads **"Trending on Audius this week"** (not "Featured on Audius")
- Header includes a `TrendingUp` icon instead of (or alongside) `Headphones`
- Everything else — track rendering, play, import, search — is unchanged
- No other component or prop changes

**Todo List:**
1. Open `app/music/page.tsx`, find the `AudiusSection` component (line ~80)
2. Change the `useEffect` fetch URL from:
   ```
   /api/music/providers/audius/search?q=popular&limit=12
   ```
   to:
   ```
   /api/music/providers/audius/trending?time=week
   ```
3. Update the section header text at line ~209:
   - Change `"Featured on Audius"` → `"Trending on Audius this week"`
   - Change icon from `Headphones` to `TrendingUp` (already imported on this page)
4. Update loading text at line ~209:
   - Change `"Loading Audius…"` → `"Loading trending tracks…"`

**Relevant Context:**
- `app/music/page.tsx` lines 92–106 (mount effect) and 205–214 (header)
- `TrendingUp` is already imported in this file (used elsewhere on the page)

---

## Architecture at a Glance

```
/music Audius tab
  → useEffect on mount
  → GET /api/music/providers/audius/trending?time=week    (new route)
  → audiusAdapter.getTrending('week')                     (new method)
  → audiusGet('/v1/tracks/trending', { time: 'week' })    (existing client)
  → AudiusTrendingResponseSchema.safeParse(raw)           (new schema alias)
  → mapAudiusTrackToNormalized(track)                     (existing mapper)
  → NormalizedTrack[]  → page renders track list          (unchanged)
```

**What does NOT change:**
- Track rendering (artwork, title, artist, duration, play button, import button)
- Search functionality
- Playback flow through the Jukebox player
- Import flow through `/api/music/import`
- Any other tab (Library, Discover, Playlists)
- Database schema
- Env vars
