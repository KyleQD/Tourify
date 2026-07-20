# Mechanical, Cover, Phonorecord, and DSP Licensing

This module distinguishes direct and statutory mechanical workflows from synchronization and public performance.

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

## Use cases

Support physical products, permanent downloads, limited downloads, interactive streams, cover recordings, karaoke, lyric videos, ringtones and custom products as separately classified uses. Jurisdiction determines whether statutory, blanket, CMO or direct licensing is available.

## United States boundary

The U.S. Section 115 framework concerns making and distributing phonorecords, including defined digital phonorecord deliveries; it does not authorize sounds accompanying audiovisual works. Tourify may prepare data and route parties but must not claim to issue a compulsory licence unless it operates through an approved process.

## Cover limitations

A compulsory cover pathway cannot be used to change the basic melody or fundamental character beyond allowed arrangement privileges. Adaptations, translations, lyric changes and mashups route to direct derivative approval.

## DSP and distributor integration

Phase 6 can generate work/recording links, ownership data, DDEX-compatible licence requests and registration checklists. Existing distributors remain responsible for release delivery unless a separate integration is approved.

## Physical accounting

Record manufacturing quantity, reserves, returns, territory, configuration, rates and statements. Payments flow to Phase 3 royalty accounting; Phase 6 stores the licence basis and usage obligations.

## No duplication

The licensing module references canonical `artist_music`, musical works and recordings. It does not create a second release/distribution table or player.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
