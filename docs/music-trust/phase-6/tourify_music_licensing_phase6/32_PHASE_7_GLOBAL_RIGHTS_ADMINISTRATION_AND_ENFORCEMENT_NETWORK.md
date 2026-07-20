# Phase 7 — Global Rights Administration and Enforcement Network Readiness

Phase 7 may extend the verified catalog and licensing exchange into ongoing rights administration, automated registration, usage detection, claims, enforcement, collections and international optimization.

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

## Potential scope

Registration and correction submissions; CMO/publisher/label administration mandates; global work-recording matching; cue/usage ingestion; royalty claims; UGC fingerprint claims; infringement evidence; notice/takedown; settlement; collection optimization; neighbouring-right enrollment; rights-reversion monitoring; and enterprise APIs.

## Required prerequisites

Phase 6 must prove authority graphs, licensing contracts, usage reporting, payment reconciliation, partner adapters, disputes, security, data quality and global territory modules. Phase 7 cannot infer an administration mandate from a Rights Passport or licensing profile.

## Boundaries

Tourify should partner with licensed/recognized administrators, societies, counsel and enforcement providers. Litigation, legal advice, collection fiduciary duties and cross-border representation require separate approval.

## Future architecture

Phase 7 consumes immutable Rights Passport and Phase 6 licence/usage events, creates administration cases and preserves external official-source status. It must not rewrite historical licences or royalty ledgers.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
