# Samples, Interpolations, Remixes, Stems, and Derivative Works

Derivative uses require precise source identification, dual-side clearance where applicable, and controls over transformation and delivery.

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

## Request types

Model master sample, interpolation/replay, remix, mashup, translation, adaptation, lyric change, arrangement, stem licence, acapella/instrumental use and user-generated derivative separately.

## Source matching

The requester identifies source recording/work, timecodes, duration, loop, prominence, proposed new work, distribution, territories, term and monetization. Fingerprinting can suggest matches but Operations or the rights holder confirms the source.

## Clearance legs

A master sample typically requires sound-recording authority and composition authority. An interpolation may not use the original master but still requires composition/derivative authority. Performer, producer, union, publicity or contractual consents may also apply.

## Commercial terms

Support flat fees, royalty percentages, ownership shares, publishing shares, producer points, advances, minimum guarantees, credit, audit, recoupment and release conditions. Terms flow to Phase 2 rights snapshots and Phase 3 allocations only after execution.

## Stem security

Stems and raw vocals remain restricted. Evaluation copies are watermarked; approved delivery is recipient- and project-scoped. Synthetic voice, voice conversion and model training are prohibited unless separately licensed.

## New asset creation

An approved derivative creates linked new work/recording records and preserves the source licence, restrictions and ongoing approval obligations. It never overwrites the source asset.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
