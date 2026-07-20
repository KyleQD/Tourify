# UGC, Social, Creator, and Platform Licensing

This module handles creator campaigns, platform use, social advertising, channel whitelisting and user-generated content at campaign or platform scale.

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

## Campaign licensing

Capture platform, creator/channel, number of posts, organic/paid use, boost/whitelist rights, territories, term, edit rights, brand, product, deliverables, music duration, monetization, takedown date and reporting obligations.

## Platform-wide licensing

Broad platform licences require enterprise contracts, repertoire/mandate proof, usage reporting, rights conflict handling, fingerprint policies, takedown processes and DDEX DSR UGC-compatible data. Tourify must not infer a platform mandate from individual artist uploads.

## Creator access

Creators receive evaluation access only for approved projects. Downloads and stems are restricted. The licence defines whether the creator can synchronize, edit, loop, monetize, sublicense to the brand/platform or retain archive copies.

## Claims and whitelisting

Record Content ID/fingerprint policies, permitted channels, claim release, revenue sharing, dispute contact and expiration. Whitelisting is a controlled instruction to an approved partner, not a permanent waiver of rights.

## Reporting

Collect post URLs, impressions, paid spend, territories, duration, campaign dates, removals and monetization. Usage reports reconcile against licensed limits and feed Phase 3 invoicing/royalties.

## Prohibited behavior

No automatic grant for a user reposting a Tourify track. Sharing inside Tourify uses existing feed/player permissions and does not create an external sync licence.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
