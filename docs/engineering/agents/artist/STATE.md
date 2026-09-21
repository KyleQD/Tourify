# Artist state

- Last reviewed SHA: `ea5c36a3b468afb82d83809746d01ad479d38541`
- Last reviewed at: 2026-09-20
- Active task: None
- Confidence: working — ARTIST-001 audit artifacts, artist-music gate adoption, and the contract-signing UI have focused verification

## Durable facts

- Mission: Own artist identity, private and public profiles, EPKs, dashboards, and artist workflows.
- Default working set is recorded in `WORKING_SET.json`.
- **Home feed analytics contract (QA-002, 2026-09-09):** `components/artist/artist-home-feed.tsx` owns the artist home feed analytics wiring — feed scope (`filter === 'home' ? 'home' : 'tagged'`), `fetchFeedStats` against `/api/artist/feed-stats` (local helper in the component), `feedStats.postCount` strip, and pending collaboration invites via `/api/feed/collaborations/pending`. The feed-stats API route (`app/api/artist/feed-stats/route.ts`) is final and must not be edited by the artist lane.
- **Discover music-card username routing (QA-002, 2026-09-09):** `app/api/discover/route.ts` re-derives `artist_username: item.author?.username || null` at the discover data boundary (`attachMusicArtistHandles`); `app/discover/page.tsx` exports `discoverMusicCardArtistPath` using the canonical `getArtistPublicProfilePath(track.artist_username || track.artist_name)`. Cards must never link by raw UUID alone. `components/discover/` remains discover-lane owned.
- **Artist music browser boundary (ARTIST-002, 2026-09-10):** `lib/artist/artist-music.ts` is the shared browser transport for `/api/artist/music/**`. It enforces `credentials: "include"`, `cache: "no-store"`, artist-music namespace validation, and shared signed-upload/cleanup behavior. The main library, analytics, certification, rights, and royalties dashboards use it. Server-side route auth remains owned by the music implementation boundary and is not changed by this task's explicit path scope.
- **Artist music server gate contract (ARTIST-002, 2026-09-10):** `lib/artist/artist-music-auth.ts` composes `requireApiUser` with an `artist_profiles.user_id = auth.uid()` lookup and stable `artist_profile_required` / `artist_profile_lookup_failed` responses, attaching the resolved profile for route handlers.
- **Artist music route auth adoption (ARTIST-004, 2026-09-10):** All 33 files under `app/api/artist/music/` use `requireArtistMusicUser`; legacy direct `requireApiUser` and `auth.getUser` gates are absent. Existing per-resource ownership predicates and trusted-write paths remain in place, with focused coverage in `__tests__/artist/music/route-auth-adoption.test.ts`.
- **Artist contract review/signing UI (ARTIST-003, 2026-09-20):** `app/artist/business/contracts/page.tsx` links owners to `/artist/business/contracts/[id]`; the server route admits only the authenticated owner or counterparty and reuses `ContractReviewClient`. `sign_artist_contract` independently enforces the caller's role and sent-state transition. Focused coverage lives in `__tests__/artist/contract-signing-ui.test.ts`.

## Domain inventory (from ARTIST-001 audit)

- **67 web routes** under `/artist/` covering identity, EPK, events, music, business, jobs, bookings, content, community, press, store, tickets
- **55 artist-facing API route files** at the audit SHA: 45 directly under `app/api/artist/` plus 10 shared routes under `app/api/artist-jobs/`, `app/api/artists/`, and `app/api/debug/check-artist-profile`
- **18 EPK components** under `components/epk/`
- **9 public artist components** under `components/public-artist/`
- **20 shared library files** under `lib/artist/`
- **22+ artist database tables** (profiles, events, EPK settings, music, blog posts, contracts, financial, jobs, marketing, merchandise, social integrations, subscription tiers, works, dashboard layouts, telemetry)
- **9 test files** (unit + 1 API test)

## Current focus

- ARTIST-001 is a completed dated audit; unanswered items in `QUESTIONS.md` are candidate follow-up work, not an audit completion blocker.
- No bounded artist task is active; remaining audit candidates should be opened as separate task records.

## Known risks

- Non-music artist API routes still need targeted auth review; the artist-music route family was standardized by ARTIST-004.
- Artist music page is a 1535-line monolith with direct Supabase imports (no service abstraction).
- 5 artist tables live in `archive/` migrations — schema reconciliation needed.
- No artist-specific test suite for most pages and API routes.

## Cross-domain dependencies

- **music agent**: CP-026 resolves the boundary: artist owns the artist-facing management surface; music owns playback, rights, royalties, ingest, and backend implementation, coordinated through interfaces/handoffs.
- **general-user agent**: Profile update crosses user-identity boundaries.
- **database agent**: `archive/` migration tables need reconciliation.
- **marketplace agent**: Store/merchandise pages need integration verification.
- **ticketing agent**: Event ticketing interfaces need verification.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- ARTIST-003 remained P2 and is now complete; a deployed owner/counterparty exercise is optional release QA unless QA-003 makes signing part of a selected core staging journey.
- Artist profile and dashboard behavior remain within the core-web certification surface; contract signing is available but remains outside the launch gate unless selected by QA-003.
