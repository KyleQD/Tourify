# Buyer Briefs, Music Supervision, and Project Workspaces

Buyer projects convert incomplete creative requests into structured, confidential briefs that can be matched to licensable catalog without exposing unnecessary information.

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

## Brief fields

Capture production/company, project codename, production type, scene description, emotional/creative references, media, territory, term, budget range, use duration, prominence, edit needs, lyrics/explicit restrictions, exclusivity, release windows, deadlines, union requirements, paid media, soundtrack, trailers, social cutdowns and delivery specifications.

## Confidentiality levels

Support public brief, verified-buyer brief, NDA-restricted brief and named-recipient brief. Scene scripts, rough cuts, storyboards, campaign plans and unreleased assets use restricted storage and expiring access. AI search must not train on confidential briefs.

## Team collaboration

Buyer teams can assign supervisor, coordinator, legal, finance, producer and approver roles; maintain shortlists; compare quotes; leave internal notes; request client approval; and export status reports. Internal notes are never visible to rights holders.

## Brief versions

Every material change creates a new version. Rights holders approve the exact version used for the quote and license. A changed territory, media, term, scene, brand or edit requirement invalidates incompatible approvals.

## Project templates

Provide templates for film/TV episode, trailer, ad campaign, game, podcast, creator campaign, event/livestream, brand activation, sample clearance and AI licence. Templates improve completeness but cannot replace classification.

## Retention and deletion

Project owners can close and archive workspaces. Legal and financial records follow retention policy; optional creative materials can be deleted after the approved period with audit evidence.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
