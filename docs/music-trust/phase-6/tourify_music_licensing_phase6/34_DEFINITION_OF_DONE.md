# Phase 6 Definition of Done

Phase 6 is complete only when the system can safely complete a real licensing case and prove every decision, approval, document, delivery, use and payment.

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

## Functional definition

A verified buyer can create a complete brief, find eligible music, request a defined licence, receive a versioned quote, satisfy every clearance leg, collect authorized approvals, execute a contract, meet effectiveness conditions, receive controlled files, submit usage/cue data, receive an invoice and reconcile payment.

## Rights definition

Composition and recording remain separate; every approver has active authority; territories/term/use are explicit; unknown/disputed shares block affected grants; pre-clearance is scoped and expiring; no implied licences exist.

## Technical definition

Additive migrations, RLS, restricted storage, idempotent APIs, outbox jobs, signed webhooks, immutable versions, audit logs, monitoring, backups and tested rollback are in production.

## Operations definition

Licensing Operations has queues, permissions, SLA, runbooks, escalation owners, quality review, support documentation and incident drills.

## Standards definition

Approved DDEX/CISAC/C2PA exchanges validate against selected versions and preserve raw/source messages, normalized data and version provenance.

## Pilot definition

Pilot cases close without unauthorized access, rights overgrant, unapproved terms, lost delivery, unreconciled cash or existing music regression. Counsel and designated stakeholders sign the launch gate.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
