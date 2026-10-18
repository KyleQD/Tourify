# Music Discovery Hub — UX implementation and handoff

Status: Implemented in draft stacked branch **feat/music-discovery-hub-ux-20261018**. Not merged, not production released.

## Goal

The signed-in homepage Jukebox is the **launch point**, not a dead-end widget. Users should hear a song, explore a track, follow an artist, discover a genre/scene, and save music while **the existing Jukebox player remains active**.

## Navigation map

| Start | Action | Destination |
|---|---|---|
| Home Jukebox | Enter Music Discovery | `/music/discover` |
| Home Song of the Day | Explore | `/music/discover?track=<catalog-track-id>` |
| Full player | Explore Music | `/music/discover`; closes overlay but does **not** stop audio |
| Sidebar | Discover Music | `/music/discover` |
| Sidebar | My Library | `/music` |
| Music Library | Discover new music | `/music/discover` |
| Music Discovery track tile | Play/pause | Existing persistent Jukebox context |
| Music Discovery artist tile | View artist profile | Canonical artist path from known artist id |
| Music Discovery nav | My Library | `/music` |
| Music Discovery nav | Explore Flow | `/discover` |

## Page blueprint

1. **Music masthead**: single recognizable Jukebox identity, visible return to homepage, saved music and full player access.
2. **Listening hero**: daily deterministic fallback song (or `track` deep link), cover art, title, artist and genre. Never claim a globally pinned editorial pick until an editorial endpoint exists.
3. **Persistent listening status**: current track and pause/resume without creating a second audio engine.
4. **Explore/search**: accessible search across actual catalog title/artist/genre/tags; active genre chips generated only from real catalog metadata.
5. **Discovery feeds**: distinct For You (simple favorites-genre affinity), Trending, Just Added; independent horizontal mobile rails.
6. **Artist discovery**: distinct artists derived from catalog relationships, links to real public artist route. No invented bios, listeners or achievements.
7. **Discovery journeys**: Mood Dial, decade, city and mystery record crates using existing strict Jukebox metadata helpers.
8. **Exit paths**: My Library / Playlists, broader artist and show discovery on `/discover`.

## What this implementation does not claim

- No global editorial authority for daily tracks; discovery date-hash varies with catalog.
- No AI audio-derived moods or year/location inference. Genre matches come from existing tags.
- No region-specific licensing bypass. Discovery uses free eligible public tracks and server-side stream entitlement remains required.
- Artist IDs are used via current public profile routing; validate artist handle mapping before production.
- No album discographies, dedicated artist-follow backend, collaborative listening-room backend, automatic venue playlists or monetization system.
- "Trending" and "Just Added" reflect the respective catalog API order, not verified external rankings.

## Next user experience milestones

- **Album, artist and genre detail pages:** canonical music graph (artists, releases, tracks, user uploads, collaborations, rights).
- **Personal collections & follows:** saved artists, favorite genres, user-controlled history, privacy, personalized feed opt-out.
- **Continuity across devices:** library and skin sync, queue syncing with authorized playback/resume.
- **Trust, charts and social context:** explain provenance of recommendations, editorial vs trending vs sponsored tagging; no fabricated numbers.
- **Venue to artist journeys:** integrate with 54, Heat and Tourify shows where true venue/artist/event associations exist.
- **Search discovery:** server-side indexed query and pagination with catalog-safe rankings, not just filtering the first ~80 recent/trending tracks.
- **Community curation:** opt-in recommendations and responsible playlist sharing, abuse prevention, verified curator labels.
- **Public access:** scope and rights controls for anonymous music discovery after authenticated version is stable.

## Acceptance tests before merge

1. Click from homepage Jukebox into Music Discovery on mobile and desktop without cutting off currently playing audio.
2. Click Song of the Day Explore and confirm its track ID is spotlighted if present in current entitled catalog; otherwise honest fallback.
3. Navigate from full player to discovery and verify drawer closes without pausing music.
4. Search by title, artist or genre; changing For You/Trending/Just Added retains entered search and genre.
5. Genre chips are derived from real tracks, not predetermined lists.
6. Mood, era and city journeys return only metadata-supported tracks, with proper empty states.
7. Artist cards navigate to a real profile; if artist ID mapping fails in staging, adapt using canonical artist handle lookup before production.
8. Device or account without a playable music catalog gets a calm, accurate empty state.
9. Verify proper keyboard focus, ARIA controls, album art fallback, reduced motion and phone scrolling.
10. Verify premium track entitlements and music rights are still enforced on every stream request.
11. Run dedicated Jukebox tests, TypeScript, Next.js build, and manual staging UX smoke test.
12. Do not merge if critical CI failures remain without approved resolution.

## Release management

Stacked dependency chain:

1. PR #23: Jukebox 2.0 `feat/home-jukebox-discovery-skins-20261018`
2. PR #33: Jukebox Discovery Playground `feat/jukebox-discovery-playground-20261018`
3. This PR: Music Discovery Hub `feat/music-discovery-hub-ux-20261018`

Review and merge in dependency order after CI and preview QA. No automatic production promotion. Feature design should eventually be extracted into Flow design-system tokens across DreamStream, Heat, and 54.
