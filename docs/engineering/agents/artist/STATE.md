# Artist state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-10
- Active task: ARTIST-002 (artist music browser transport and server auth gate contracts standardized)
- Confidence: working — contracts and focused checks pass; route adoption remains coordinated follow-up

## Durable facts

- Mission: Own artist identity, private and public profiles, EPKs, dashboards, and artist workflows.
- Default working set is recorded in `WORKING_SET.json`.
- **Home feed analytics contract (QA-002, 2026-09-09):** `components/artist/artist-home-feed.tsx` owns the artist home feed analytics wiring — feed scope (`filter === 'home' ? 'home' : 'tagged'`), `fetchFeedStats` against `/api/artist/feed-stats` (local helper in the component), `feedStats.postCount` strip, and pending collaboration invites via `/api/feed/collaborations/pending`. The feed-stats API route (`app/api/artist/feed-stats/route.ts`) is final and must not be edited by the artist lane.
- **Discover music-card username routing (QA-002, 2026-09-09):** `app/api/discover/route.ts` re-derives `artist_username: item.author?.username || null` at the discover data boundary (`attachMusicArtistHandles`); `app/discover/page.tsx` exports `discoverMusicCardArtistPath` using the canonical `getArtistPublicProfilePath(track.artist_username || track.artist_name)`. Cards must never link by raw UUID alone. `components/discover/` remains discover-lane owned.
- **Artist music browser boundary (ARTIST-002, 2026-09-10):** `lib/artist/artist-music.ts` is the shared browser transport for `/api/artist/music/**`. It enforces `credentials: "include"`, `cache: "no-store"`, artist-music namespace validation, and shared signed-upload/cleanup behavior. The main library, analytics, certification, rights, and royalties dashboards use it. Server-side route auth remains owned by the music implementation boundary and is not changed by this task's explicit path scope.
- **Artist music server gate contract (ARTIST-002, 2026-09-10):** `lib/artist/artist-music-auth.ts` composes `requireApiUser` with an `artist_profiles.user_id = auth.uid()` lookup and stable `artist_profile_required` / `artist_profile_lookup_failed` responses, attaching the resolved profile for route handlers.
- **Artist music route auth adoption (ARTIST-004, 2026-09-10):** All 33 files under `app/api/artist/music/` use `requireArtistMusicUser`; legacy direct `requireApiUser` and `auth.getUser` gates are absent. Existing per-resource ownership predicates and trusted-write paths remain in place, with focused coverage in `__tests__/artist/music/route-auth-adoption.test.ts`.

## Domain inventory (from ARTIST-001 audit)

- **67 web routes** under `/artist/` covering identity, EPK, events, music, business, jobs, bookings, content, community, press, store, tickets
- **56+ API routes** under `app/api/artist/` (events, EPK, music, business, content, public-appearance, feed-stats)
- **18 EPK components** under `components/epk/`
- **9 public artist components** under `components/public-artist/`
- **20 shared library files** under `lib/artist/`
- **22+ artist database tables** (profiles, events, EPK settings, music, blog posts, contracts, financial, jobs, marketing, merchandise, social integrations, subscription tiers, works, dashboard layouts, telemetry)
- **9 test files** (unit + 1 API test)

## Current focus

- Audit complete. Awaiting product owner answers to 16 prioritized questions in `QUESTIONS.md`.
- Follow-up tasks will be created from answered questions.

## Known risks

- 22+ artist API routes flagged "manual review required" for auth — inconsistent auth patterns.
- Artist music page is a 1535-line monolith with direct Supabase imports (no service abstraction).
- 5 artist tables live in `archive/` migrations — schema reconciliation needed.
- No artist-specific test suite for most pages and API routes.
- EPK builder fully implemented but no subscription gating detected.
- Contract signing backend exists but no artist-facing UI.

## Cross-domain dependencies

- **music agent**: Artist music pages and 34 music API routes overlap. Ownership unclear.
- **general-user agent**: Profile update crosses user-identity boundaries.
- **database agent**: `archive/` migration tables need reconciliation.
- **marketplace agent**: Store/merchandise pages need integration verification.
- **ticketing agent**: Event ticketing interfaces need verification.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- ARTIST-003 remains P2 and is not a launch blocker unless QA-003 demonstrates that contract signing is required by a selected core staging journey.
- Artist profile and dashboard behavior remain within the core-web certification surface even though the contract-signing enhancement is deferred.
