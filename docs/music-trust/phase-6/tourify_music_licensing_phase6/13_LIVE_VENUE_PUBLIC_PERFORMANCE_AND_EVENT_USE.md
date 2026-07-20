# Live, Venue, Public Performance, and Event Use

Tourify already understands artists, venues, organizations, events and tours. Phase 6 adds rights clearance without conflating event booking with music licensing.

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

## Event uses

Classify live performance of a composition, playback of a commercial recording, DJ set, background music, walk-on music, livestream, recording, simulcast, rebroadcast, event recap, sponsor content, on-demand archive and downloadable content separately.

## Venue/promoter licences

Public-performance obligations often depend on venue, promoter, service and territory. Tourify can record licences and route to PRO/CMO partners, but an artist booking or venue profile does not prove that blanket licences exist or cover livestream, reproduction, master use or advertising.

## Setlists and reporting

Artists and event teams can generate setlists with work identifiers, submit performance reports, attach venue/event identifiers and route reports to approved societies. Setlists never alter ownership.

## Event capture

Recording or livestreaming a performance may require performer releases, composition rights, master/re-recording terms, union/reuse, venue and audience/privacy permissions. The event workspace creates clearance legs and delivery restrictions.

## Sponsor use

When event music is used in sponsor or brand media, route through the brand/advertising module with explicit out-of-context and paid-media terms.

## Integration

Add licensing status to existing event/tour workspaces through references and feature flags. Do not create a second event system.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
