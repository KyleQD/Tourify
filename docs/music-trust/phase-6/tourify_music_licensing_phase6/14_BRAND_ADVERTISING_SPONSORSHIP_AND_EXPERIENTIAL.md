# Brand, Advertising, Sponsorship, and Experiential Licensing

Brand uses require heightened context, exclusivity, category-conflict, paid-media and reputation controls.

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

## Brief data

Capture brand/product, agency, campaign, claim/message, competitors, category, territories, term, media, paid spend, channels, cutdowns, edits, influencer use, events, retail, internal use, awards/archive, exclusivity and options.

## Context approval

Rights holders see scripts, storyboards, rough cuts or detailed context before final approval. Sensitive categories and political/advocacy uses default to manual review.

## Exclusivity

Model category, named competitors, territory, duration, artist-level vs song-level scope, blackout dates and existing conflicts. An exclusivity grant creates a searchable hold against incompatible requests.

## Endorsement separation

Music licensing does not imply artist endorsement. Name, image, likeness, voice, social posting, appearance and testimonial rights require separate agreements and approvals.

## Agency/client authority

Confirm whether the agency can bind the client, pay invoices, receive files and sublicense within the campaign. Client changes require re-verification.

## Brand safety

Automated risk signals can flag context but cannot make reputational decisions for the artist. Final approvals remain human and versioned.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
