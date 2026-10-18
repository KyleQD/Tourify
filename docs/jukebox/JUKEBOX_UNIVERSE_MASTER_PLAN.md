# Flow Jukebox Universe — Product & Engineering Master Plan

Status: **Approved product direction, partial feature implementation**. Do not treat any planned item as shipped. Branch `feat/jukebox-discovery-playground-20261018` builds on draft PR #23, which itself is not merged.

## Experience vision

One persistent playback system powers a modular Jukebox across Flow, Tourify, DreamStream, Heat, Werk, 54, Bzar and Prez. Users keep a single general account identity with compatible profile/account permissions. No autoplay, fake tracks, inferred hometowns or unlicensed audio sources. A Jukebox can be mounted in a user profile, artist page, venue page, event page or approved community room.

### A. Personal Jukebox
- 13+ skins; expand toward immersive chromed jukebox, moving record changer, 3D cassette reels, DJ decks, psychedelic visuals and minimal accessibility mode.
- Global editorial Song of the Day + Secret B-Side companion discovery, with immutable daily spotlight provenance, region overrides and archive.
- For You, Trending, Surprise Me, Mystery Record Crate, Mood Dial, Time Machine (release-year verified), and City Soundtracks (hometown/scene metadata verified).
- Music Passport genre stamps (device-only opt-in in first prototype; signed, server-verified achievements later).
- Music postcards shared as authorized preview links, with optional recipient note and privacy controls.

### B. Collaborative Jukebox ("Pass the AUX")
A real-time listening room is a **shared queue and playback position**, never an unauthorized rebroadcast.
- Room owner/host with round-robin, democratic-vote and moderated guest-request queue modes.
- Join by invitation or approved public URL; authenticated owner/admin controls.
- Each attendee individually requests an entitled stream through existing rights checks. If unavailable, show "Not playable for your account/region" and offer eligible fallback, not a bypass.
- Realtime sync broadcasts only track ID, start timestamp, paused state and queue version, not unprotected audio payload.
- Controls: owner can end/kick/mute chat, block suggestions, clear queue; joiners can report abuse and leave.
- Database candidates: jukebox_rooms, jukebox_memberships, jukebox_queue_entries, jukebox_votes, jukebox_moderation_events (FK names audited against canonical schema).
- Server transactions for queue ordering/vote caps; multi-tenant RLS by room membership + ownership + account role; preserve venue ownership boundaries.
- Rate limiting per account, blocked-user rules, privacy, presence TTL and reconciled state after disconnect.

### C. Venue, event and artist Jukeboxes
- Venue admin (54) manages featured tracks from upcoming/previous **actual** performers, show schedules and venue history.
- Event links to Heat listing/Tourify production record. "Tonight's Lineup", "Backstage Picks", "Venue Classics" and "Afterparty Radio" are distinct *curated playlists*, not fabricated track associations.
- Artist takeovers are authorized, scheduled, attributable to the artist (and the specific artist account), reviewed when necessary.
- Ticket Stub Mixtapes are user-controlled memory collections generated only from accurately associated performers and tracks. Never claim the user attended based solely on clicking a show.
- Verified QR/join links expire, are rate-limited, and only link to an appropriately approved public room/show.

### D. Games and collectibles
- Guestlist Games rhythm challenge integration: game feed placement consent, opt-in sound, tracks licensed for in-game snippets/performance; track recognition scores must not be falsely verified.
- Name That Tune + song battles: licensed previews, abuse-resistant votes, transparent rules, and separate gaming reward models.
- Creator-designed skins: sandboxed declarative tokens/assets, audited uploads, accessibility contract, moderation, versioning and Bzar distribution; no arbitrary executable code from creators.
- Collectible Music Passport: opt-in, earned genre/city/venue stamps. Differentiate personal-device stamps from signed, verified achievements. Use validated listening/event evidence and anti-fraud thresholds, not client-supplied success booleans.
- Friendly seasonal events with limited-time visuals but never lock basic playback behind collectibles.

## Delivered foundations

**PR #23**: dashboard Jukebox rebuild, deterministic *fallback* daily selection, favorites-influenced recommendations, trending, Surprise Me, 13 shared visual skins, Node.js 24 branch configuration, initial tests.

**Discovery Playground stacked PR**: Mood Dial via existing genre/tag signals, exact tagged-decade filters, exact tagged-city filters, deterministic multi-track crates, related hidden companion discovery, opt-in device-only genre passport.

**Not delivered**: realtime rooms, synchronized licensing checks, global editorial pipeline, verified listening badges, server-side subscriptions, venue administration, music postcards, game licensing, bespoke 3D skins or account-synced settings.

## Core data contract and release gates

Before changing database schema, audit actual canonical music tables, identities, account scopes, moderation fields, venue/show IDs, and existing licensing APIs. Create versioned migrations with RLS on all exposed tables. All entitlement decisions are server-side. User-editable metadata is NOT a source of authorization. Client may show previews only via authorized routes. Cross-app exposure uses consistent track IDs and account identity. Streaming file extension (.flow or otherwise) does not provide DRM.

- Site accessibility: keyboard operation, meaningful labels, color contrast, reduced-motion, screen reader queue updates.
- Performance: no autoplay or heavyweight shaders on initial feed render; lazy load expanded scenes; pause effects while hidden.
- Privacy: no default listening surveillance, personal recommendations controls and data deletion, no leaking private queues/play history.
- Abuse prevention: room capacity, message and vote throttles, profanity/report handling, remove/ban policy and event audit trail.
- Creator safety: user-owned uploaded art remains subject to rights ownership, visible attribution and media transformation permissions.
- Trust: differentiate editorial, algorithms, community picks, and paid/sponsored placements on screen.
- Observability: time-to-interactive, player drop-offs, skipped unavailable tracks, authorized playback failures, moderation incident rates, room sync drift.

## Delivery sequence

1. **Stabilize PR #23**: run focused Jukebox tests, browser QA, resolve CI/test baseline separately, validate Vercel preview. Do not auto-merge while failure states remain.
2. **Ship Discovery Playground** after #23: verify metadata handling and local stamp privacy on desktop/mobile.
3. **Editorial & catalog metadata:** scheduled spotlights, actual release year & tagged hometown fields, rights-approved discovery, per-user settings sync.
4. **AUX rooms foundational backend:** room lifecycle, identity, entitlements, immutable queue transitions, Realtime membership, RLS security tests.
5. **AUX front end:** host/invite/participate, accurate sync, chat moderation and inaccessible-track fallback.
6. **Venue/event/artist installations:** account authorization across 54/Tourify/Heat, curator sessions, verified lineup association.
7. **Social musical postcards and Ticket Stub Mixtapes:** privacy, artist attribution and ticket history.
8. **Immersive/creator skins + Bzar distribution:** declared asset format, signed theme registry, creator royalties.
9. **Music Passport 2.0 and Guestlist Games:** fraud-resistant verified achievements, accessible rewards, licensed music interactions.
10. **Rollout:** gated beta with explicit operator approvals, monitoring, rights and load tests. Production release only when all critical gates pass.

## Acceptance contract for every work package

- One accountable owner, tests, rollback notes and privacy/rights review.
- No fictitious user counts, music catalogs, venue history, or performance metrics.
- Feature flags default **off** for unverified enterprise/real-time features.
- Empty states and failure states are honest.
- Security-sensitive operations use server authorization plus tested RLS, with audit logging where warranted.
- Integration references use canonical Flow user identity, Tourify events, 54 venues and rights-approved DreamStream tracks.
- Merge only after automated checks and human review.

## Known build baseline

At time of this plan, PR #23 CI showed two unrelated existing Jest failures in auth cron authorization and marketplace backfill server-only imports (69 other suites passed); do not relax cron auth or remove server-only protections to hide tests. Preserve these as separate bugs requiring their own security analysis.
