# Flow / Tourify Jukebox 2.0 — Homepage Implementation

Status: **Phase 1 pull-request candidate**, not deployed. This branch enhances the existing signed-in home Jukebox without replacing the app-wide playback provider.

## Implemented in this branch

- Redesigned dashboard right-rail Jukebox (components/dashboard/jukebox-player.tsx) with responsive compact player, album art, play/pause/skip, accessible seek slider, and links into the expanded player.
- Added Song of the Day discovery row with deterministic UTC-day hashing over a recent/trending public music pool. This is NOT an editorially scheduled immutable global selection; changes to the pool can change the pick.
- Added For You recommendations based on favorite genre similarity, with fallback discoveries when the user has no favorites, and a separate Trending tab.
- Added Surprise Me, choosing an eligible free public discovery track.
- Extended the shared theme registry from seven to thirteen skins. Selection updates the existing JukeboxProvider visual theme across the homepage, persistent player and expanded player. The existing provider persists the choice in localStorage on the device.
- Reused existing stream authorization, playback queue, favorites/library and social actions. No fabricated songs or unlicensed audio files were added.
- Added unit tests for deterministic daily picks and track filtering.

## Known limitations and planned follow-ups

1. **Editorial daily spotlight:** Add an editor-managed table and approved, globally pinned Song of the Day API. Daily hash is only a fallback, not editorial.
2. **Cross-device skins:** Existing localStorage persistence is NOT account-based synchronization. Establish a canonical user preference API/RLS and migration from guest settings.
3. **Personalization:** Current ranking uses favorite genre similarity and cold-start recency; it is not AI/ML. Introduce user-controlled discovery balance, opt-in listening signals, exclusions, diversity and anti-fraud measures.
4. **Advanced skins:** Existing color/surface variants are live, but physical-looking reels, animated jukebox mechanics, custom GPU visualizers, creator skin submissions and Bzar marketplace are future milestones. Honor reduced motion.
5. **Community features:** Listening parties, daily song voting, song battles, Name That Tune, international discovery and rhythm games are future integrations requiring licensing/moderation.
6. **Playback access:** Continue server-side verification for all free and paid content. Avoid URL leakage or audio bypasses. Never autoplay.
7. **Honest empty states:** Only show real available songs. If the catalog is empty or unavailable, show the relevant state.

## Proposed editorial contract (future)

Table: jukebox_spotlights
- id UUID primary key
- date_utc DATE not null
- region_code TEXT null (global is null)
- slot TEXT (song_of_day, local_spotlight, etc.)
- music_track_id UUID not null (foreign key to the audited canonical music catalog)
- status TEXT (draft, approved, scheduled, live, retired)
- created_by, reviewed_by, published_at and editorial audit timestamps
- uniqueness/exclusion rules for approved selections per date, region and slot

Read route: GET /api/jukebox/spotlight?date=YYYY-MM-DD&region=...
Response: date, slot, canonical track, source, rights eligibility and editorial attribution.
Moderation, RLS, permissions and cache invalidation must be part of the design.

User preference fields: skinId, discoveryMode, exploration, preferredGenres, excludedArtists and allowPersonalization. Ensure private preferences are readable only under appropriate authorization and explicit controls.

## QA before merging

- [ ] Run npx vitest run __tests__/jukebox/home-discovery.test.ts
- [ ] Run npm run typecheck in compatible Node environment
- [ ] Test dashboard at mobile and desktop viewport widths
- [ ] Test public free music play/pause, seek and next/previous
- [ ] Verify no paywall bypass for restricted catalog items
- [ ] Confirm skin selection syncs across player surfaces and persists after reload
- [ ] Confirm audio survives visual skin changes and expansion
- [ ] Verify keyboard accessibility and reduced-motion behavior
- [ ] Test catalog empty state and service failure state
- [ ] Check production Tailwind classes are generated

## Not yet shipped

Editorial scheduling, account-synced preferences, music battles, co-listening, community skins, external provider playback, music games, artist sponsorship and ranking optimization. These are tracked requirements, not completed features.
