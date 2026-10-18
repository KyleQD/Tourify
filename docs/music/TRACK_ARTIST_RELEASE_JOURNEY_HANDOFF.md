# Tourify Music — Track, Artist and Release Journeys

Status: implemented on draft branch `feat/music-track-release-artist-journeys-20261018`; not approved for production.

## Goals

The Jukebox serves as the launchpad for a continuous music journey:

`/dashboard` Jukebox → `/music/discover` → `/music/tracks/[trackId]` → verified public artist profile `/artist/[slug]` → catalog and shows, or `/music/releases` → `/music/releases/[releaseId]`.

The existing audio engine remains mounted in the global app chrome; route transitions should never create a competing player.

## Implemented changes

- **Track detail pages** with art, artist credit/link where canonical profile handle exists, release/genre metadata, artist-written description, authorized player action, queue/save/share, more tracks from the same creator, and routes back to music discovery.
- **Release discovery page** at `/music/releases`: only approved, rights-confirmed, published artist uploads explicitly classified album, EP or mixtape. The catalog currently treats some album/EP uploads as single records, *not* a relational multi-track release; do not fabricate a tracklist or credits.
- **Release detail pages** at `/music/releases/[releaseId]`, based on actual release-typed entries in `artist_music`.
- **Artist bridge**: music card artist handles come from the current public music feed, not from raw owner UUID misinterpreted as a profile slug. Artist profiles link back into user-ID-filtered music discovery; music profile song rows open an actual track-detail view.
- **Music discovery** search can accept `artistId` deep links and calls existing public approved music endpoint filtered to that owner; it also has an obvious releases destination.
- **Safe public DTO**: reads server-side using existing Supabase client, independently filters `is_public`, `is_visible`, `moderation_status=approved` and `rights_confirmed`. No raw private file URL, storage path, secret or payment metadata is serialized to the browser; music streams still use the existing `/api/music/stream?trackId=...` permission check.
- **Quality**: isolated pure serializers, invalid UUID handling, release-type logic, capped description/tag fields and focused tests.

## Catalog realities and decisions

1. `music_tracks` is the preferred public song feed in the current implementation, with `artist_music` fallback for legacy content.
2. `artist_music.type=album|ep|mixtape` is an *upload classification*. Until canonical release-to-track links exist, pages clearly disclose that tracklists and release credits are not yet validated.
3. `artist_profiles.url_slug` is preferred for artist links; missing/hidden profile handles must not be invented. Public catalog artist IDs represent owning user accounts, not route slugs.
4. Release date comes only from `release_date`; never use `created_at` to imply original release era.
5. Full audio and preview rights are controlled by existing server endpoints, not by client flags, file extension or UI labels.

## Acceptance tests and release safety

- Artist handle in a track card resolves to a real public profile; if it doesn't, use an artist-music filtered discovery link rather than a guessed route.
- Invalid or private track/release URLs return a proper not-found state, not sensitive metadata.
- Artist page's song detail button opens a route and preserves the existing playback provider.
- Track/play/release cards do not interrupt Jukebox audio when navigating by Next.js client navigation.
- A paid track cannot bypass stream authorization or claim to be free. Save and queue errors are handled honestly.
- New `public-catalog-normalize` tests pass, in addition to Jukebox discovery tests and strict TypeScript checking.
- Review database RLS and actual catalog grants in staging; tests/preview builds alone cannot demonstrate production authorization policies.
- Accessibility smoke test: controls, reduced motion, touch targets, keyboard navigation, back history, artist route, focus handling.
- Check Vercel Preview build and protected staging before merging.

## Deferred — requires data model governance before implementation

- A canonical release table (artist-owned IDs, title, cover art, artwork ownership, release date, version) and release tracks with ordered positions, contributor credits, ISRC/UPC if supplied, rights territory flags, review status, and per-track availability.
- Artist/band identity resolvers across `artist_profiles`, `profiles`, organizations and band accounts, avoiding owner-user ID/profile ID/slug confusion.
- Song-to-venue and festival/show associations from verified Tourify/Heat/54 lineup records.
- Dedicated indexed catalog search (current music discovery filters a bounded catalog).
- User-synced skin settings and listening history privacy preferences.
- Cross-app DreamStream distribution and rights enforcement, licensing/DRM decisions, album-level purchases with individual track entitlements.
- Editorial curation and a Song of the Day schedule.

## Stacked review order

1. #23 — Jukebox home
2. #33 — Discovery Playground
3. #34 — Music Discovery UX
4. This PR — Track, artist and release connections

Draft branches must be reviewed and merged in that dependency order. Do not deploy to production without successful preview QA and release approval.
