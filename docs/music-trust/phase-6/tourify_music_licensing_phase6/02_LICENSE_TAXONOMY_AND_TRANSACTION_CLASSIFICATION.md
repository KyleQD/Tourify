# License Taxonomy and Transaction Classification

Every request must be classified before discovery results, quotes, approvals or contract templates are selected. Classification is a data and workflow decision reviewed by counsel/operations rules; it is not generated from free text alone.

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

## Primary licence families

Support explicit families: synchronization; master use; mechanical reproduction/distribution; public performance/communication; digital sound-recording performance; neighbouring rights; sample; interpolation; remix/derivative; stem access; lyric/print; artwork; name/likeness/voice; UGC/platform; live/event capture; podcast; game; trailer/promo; brand/advertising; commissioned music; AI training; AI output/reference; and custom/manual.

## Composition and recording separation

A pre-existing recording in audiovisual media normally requires both composition-side synchronization authority and master-side use authority. A re-record may avoid the existing master but still needs composition authority and may require derivative/arrangement approval. The classifier creates separate clearance legs and never marks a request complete because only one side is cleared.

## Use dimensions

Classification records media, production type, in-context/out-of-context use, duration, prominence, edit/loop rights, lyrics display, territory, term, distribution windows, paid media, social cutdowns, trailers, festivals, soundtrack rights, exclusivity, options, renewal, sublicensing, archival use, and deliverable formats.

## Statutory and collective pathways

Some uses may be covered by statutory, blanket or collective arrangements in a territory, while others require direct grants. The system records the claimed pathway and evidence. It never assumes a U.S. Section 115 mechanical path authorizes synchronization or that a venue’s public-performance licence authorizes livestream recording, reproduction, master use or advertising.

## Classification states

Use `draft`, `needs_information`, `classified`, `counsel_review`, `partner_routed`, `rejected`, and `superseded`. Material changes to media, territory, term, product, scene, edit rights or exclusivity create a new version and may invalidate prior approvals and quotes.

## Default deny

Unknown or mixed uses route to manual clearance. Automated classification may suggest likely rights but cannot grant authority, choose a compulsory pathway, or bind a rights holder.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
