# Artist decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-005 — Public artist and band media comes from the EPK document, and artist stats are derived

- Date: 2026-09-25
- Status: accepted
- Task: ARTIST-005 (Wave 34, DB-008 code-drift cluster "artist")
- Decision: The public artist/band gallery is built from `artist_epk_settings.settings.photoItems` through the pure mapper `lib/public-artist/artist-epk-media.ts` (`epkMediaItemsFromRows`, hero first, de-duplicated, capped). `artist_photos` and `artist_videos` are no longer read anywhere in the artist lane; the active chain never created them. Public stats come from `lib/public-artist/artist-stats.ts` (`derivePublicArtistStats`) and dashboard stats from `lib/artist/artist-stats.ts` (`buildArtistStats`), both derived from in-chain rows; the `get_enhanced_artist_stats` RPC is gone from the artist lane. `videoCount` and the public video gallery are permanently 0/absent until an in-chain artist video relation exists.
- Evidence: `lib/public-artist/artist-epk-media.ts`; `lib/public-artist/artist-stats.ts`; `lib/artist/artist-stats.ts`; `lib/public-artist/get-public-artist-profile.ts` (band + single-artist aggregation); `contexts/artist-context.tsx` `loadArtistStats`; `__tests__/artist/db008-code-drift-repoints.test.ts`; `lib/services/epk.service.ts:482-503` and `:675-677` already read `settings.photoItems` as the canonical media store.
- Consequences: The public profile gallery stops returning empty because the query used to fail, and the artist dashboard stops showing zeros. `monthly_listeners` / `futureMonthlyListeners` stay 0 (no in-chain source) and `engagementRate` is now defined as a follower-normalized like percentage capped at 100 — a semantic the old RPC value never guaranteed. Band media still honors the ARTIST-005 privacy gate: only `artist_epk_settings` rows with `is_public = true` belonging to members whose own artist profile is public are aggregated.

## DOMAIN-004 — Artist event crew is a staff_members record linked by event_participants, scoped server-side

- Date: 2026-09-25
- Status: accepted
- Task: ARTIST-005 (Wave 34, DB-008 `event_staff` / `event_crew_assignments`)
- Decision: Artist event crew is stored as a `staff_members` person record (the de-facto organization person per `lib/admin/workforce-identity-map.ts`, canonical destination `organization_people` under WORK-102) linked to the event through the chain's event roster `event_participants` (`event_id -> events.id`, `participant_id = staff_members.id`, `participant_type = 'staff_member'`). The `StaffMember`/`CrewMember` shapes the operations and event-detail pages consume are unchanged. `organization_people` is not in the contract yet, so it is recorded as the long-term destination rather than used today. Every crew mutation in `app/artist/events/actions/manage-staff.ts` now verifies event ownership server-side (`assertEventScope`: `events.created_by` or `events.artist_id` must equal the caller) before reading or writing.
- Evidence: `app/artist/events/actions/manage-staff.ts`; `app/artist/events/[id]/page.tsx` `loadCrewMembers`; `lib/database.types.ts` `event_participants` (single FK to `events.id`) and `staff_members`; `lib/admin/workforce-identity-map.ts:59-73`.
- Consequences: The `/artist/events/operations` crew tab and the event-detail crew tab stop failing on every load. The previous code had no authorization at all — any authenticated caller could pass any `event_id`. Deleting a crew entry now unlinks it from the event and leaves the canonical `staff_members` person record intact, so the organization roster is not forked or destroyed. If WORK-102 lands `organization_people`, only the two read/write helpers move; the page contracts do not.

## DOMAIN-003 — Band public profiles aggregate accepted-member content server-side

- Date: 2026-09-24
- Status: accepted
- Task: ARTIST-006
- Decision: `getPublicBandProfileDTO` aggregates accepted member content (music, media, storefront) onto the band page instead of hardcoding empty tracks/products/media. Music/media reuse the single-artist public filter (`is_public`/`is_visible`/`moderation_status='approved'`/`rights_confirmed=true`); the storefront reuses the marketplace public listing filter (`status='published'` + `moderation_status='approved'`) across member `seller_user_id`s because `/api/marketplace/discover` can only express one seller. The page seeds the storefront grid from `dto.products` and still loads the band's storefront banner/theme config client-side. Content aggregation is limited to accepted members — band-owner non-member content is intentionally not surfaced.
- Evidence: `lib/public-artist/get-public-artist-profile.ts` `resolveBandContentUserIds` + band aggregation block; `lib/public-artist/band-storefront.ts`; `components/public-artist/public-artist-page.tsx` band storefront seeding; `lib/public-artist/public-artist-types.ts` `PublicArtistProductDTO` extension; `__tests__/artist/band-profile-content-aggregation.test.ts`.
- Consequences: Band pages now surface playable music, media, and member-storefront listings with a coherent empty state. The ARTIST-005 gate is honored at the band aggregation boundary: members whose artist profile is hidden never contribute content. The marketplace discover API remains single-seller; multi-seller band aggregation lives in the artist public-artist lane. If a later rerun expects owner non-member content on the band page, extend the eligible-user resolution rather than adding a new data source.

## DOMAIN-002 — Profile visibility selector maps to the canonical settings.public_profile boolean

- Date: 2026-09-24
- Status: accepted
- Task: ARTIST-005
- Decision: The artist profile visibility selector ("Public", "Verified users only", "Private — invite only") now maps to the canonical read model `artist_profiles.settings.public_profile` through `lib/artist/profile-visibility.ts`. `public` and `verified` → `true`; `private` → `false`. The legacy `settings.preferences.privacy_settings` string is kept for display round-trips only. "Verified users only" has no read-side enforcement today and remains effectively public until a verified-only gate is built; the flag write keeps it consistent with the pre-fix behavior (fully visible).
- Evidence: `lib/artist/profile-visibility.ts`; `contexts/artist-context.tsx` `updateDetailedProfile`; `app/artist/profile/page.tsx` `buildFormFromProfile`; `app/api/artist/[artistName]/route.ts` data-boundary gate; `__tests__/artist/profile-visibility-gate.test.ts`.
- Consequences: Public read gates (`getPublicArtistProfileDTO`, enhanced/account search, the owner-only private-preview banner) already honored the boolean, so the write-path mapping is what makes Private actually hide a profile from non-owners. Any future verified-only enforcement must extend the read gates, not the boolean model. Defaults are unchanged (missing flag = public).

## DOMAIN-001 — Artist music pages use one owned transport contract

- Date: 2026-09-10
- Status: accepted
- Task: ARTIST-002
- Decision: Artist music dashboards use `lib/artist/artist-music.ts` as the browser boundary for `/api/artist/music/**` requests and signed artist-music uploads. The helper enforces session credentials, no-store reads, and rejects paths outside the artist music namespace.
- Evidence: The main library, analytics, certification, rights, and royalties pages now use the shared helper; `__tests__/artist/artist-music-surface.test.ts` verifies the contract and page adoption.
- Consequences: Artist-facing pages own transport/orchestration while the music domain retains playback, rights, royalties, ingest, and server-side route implementation under CP-026. Server-route auth convergence remains a follow-up outside this task's explicit `app/artist/` + `lib/artist/` write boundary.
