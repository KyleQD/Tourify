# Synchronization, Master-Use, and Audiovisual Licensing

This module handles use of music with moving images while maintaining separate composition and sound-recording clearance legs.

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

## Required data

Capture audiovisual production, scene, duration, timing, visual context, characters/products, in-context/out-of-context use, territories, term, media/windows, trailers, promos, paid media, social, festivals, airline/educational use, soundtrack, clips, edits and exclusivity.

## Composition and master

A sync request creates a composition leg and, when an existing recording is used, a master-use leg. It may also create performer, union/reuse, lyric display, name/likeness, artwork and trademark legs. A re-record still requires composition clearance and may require arrangement approval.

## Sensitive-context controls

Rights holders can prohibit or require special approval for politics, weapons, alcohol, gambling, adult content, tobacco/nicotine, pharmaceuticals, religion, advocacy, AI, violence or competitor brands. Context restrictions are evaluated before audio is delivered.

## Delivery

Approved delivery can include watermarked evaluation file, full-resolution master, instrumental, clean, acapella, stems and metadata. Each delivery grant records recipient, purpose, expiry, watermark and download history.

## Cue sheets

The license includes cue-sheet responsibility, identifiers and submission deadline. Phase 6 supports CISAC Global Cue Sheet Standard 2.0/AVR+ compatible exports where approved.

## Amendments

Additional episodes, territories, media, term, promos, edits or soundtrack uses require amendment or a new license. The platform calculates whether existing approval envelopes cover the change but does not assume consent.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
