# Film, Television, Games, Podcasts, and Trailers

Different audiovisual and interactive products require distinct usage, term, media and reporting models.

## Non-negotiable controls

- Preserve `artist_music` as the canonical upload/catalog row and keep the existing private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile player, marketplace, feed, profile, EPK, and analytics paths intact.
- Never reset the database. Use additive migrations, reversible feature flags, explicit backfills, RLS, restricted storage, audit events, and compensating records.
- A Rights Passport claim is evidence, not automatic licensing authority. The exact right, asset, territory, media, term, use, exclusivity, approval requirement, and contractual mandate must be verified before Tourify can show a work as licensable.
- Default to `inquiry_only`, `manual_clearance`, or `unavailable` when authority is incomplete, disputed, expired, territory-limited, approval-dependent, or controlled by a third party.
- Tourify must not grant a license on behalf of a publisher, label, CMO, performer, union, estate, administrator, or other controller unless an active written mandate authorizes Tourify to do so.
- Composition, sound recording, performer/neighbouring rights, name/likeness, lyrics, artwork, trademark, union/reuse, and privacy rights remain separate clearance objects.
- No buyer-facing price, availability, or approval status may be inferred from valuation, popularity, streams, or AI recommendations alone.
- AI-training and synthetic-output licensing is a separate, explicit opt-in product. It may never be bundled into ordinary hosting, promotion, distribution, sync, or certification terms.
- Confidential buyer briefs, unreleased media, stems, contracts, tax forms, and identities must remain in restricted storage with short-lived access and audit logging.
- All external partner records, signatures, payment confirmations, CMO results, and legal documents are versioned and reconciled; no silent overwrite is allowed.

## Film and television

Support episode/series, production code, scene, episode count, festival, theatrical, broadcast, cable, SVOD/AVOD/FAST, home video, airline, educational, clips, promos, soundtrack and perpetuity/limited-term options.

## Games

Capture platform, game title, in-game/radio/menu/trailer use, interactive/adaptive behavior, downloadable content, live services, user-created content, esports, streaming/creator rights, soundtrack and region.

## Podcasts and audio

Distinguish intro/outro, background, featured playback, episodic vs series, downloads, streams, ads, clips, live events and transcript/lyrics uses. Sound-recording and composition performance/reproduction requirements vary by use and territory.

## Trailers and promos

Trailer rights are not assumed from in-program sync. Record theatrical, broadcast, online, social, paid media, exhibitor, awards and internal sales uses separately.

## Commissioned music

Commission workflows define ownership, work-made-for-hire language, exclusivity, revisions, stems, reuse, composer credit, performance royalties, delivery and kill fees. Tourify does not choose legal ownership terms automatically.

## Delivery and cue data

Project-specific delivery packages include approved audio, metadata, credits, cue-sheet identifiers and restrictions. Every recipient and version is logged.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
