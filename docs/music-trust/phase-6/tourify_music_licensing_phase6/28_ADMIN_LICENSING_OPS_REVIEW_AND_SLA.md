# Admin Licensing Operations, Review, and Service Levels

Phase 6 requires a dedicated Operations surface rather than generic admin database editing.

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

## Queues

Queues include new buyer verification, availability review, missing authority, request intake, quote SLA, pending approvals, expiring quotes, contracting, delivery, cue sheets, unpaid invoices, usage exceptions, conflicts, partner failures and legal holds.

## Permissions

Use least-privilege capabilities for intake, rights review, financial operations, document operations, legal escalation, partner support and system administration. High-risk actions require dual control.

## SLA

Define response and escalation targets by product tier and request deadline. Track queue age, owner, next action and breach reason. SLA does not create legal approval or guarantee clearance.

## Manual overrides

Overrides require reason, authority, evidence, second approver where configured and audit event. Staff cannot override rights ownership, signed terms, sanctions blocks or partner official records through UI.

## Quality review

Sample completed cases for authority, terms, data, delivery, cue sheets, billing and buyer/artist communication. Findings create remediation tasks and policy updates.

## Runbooks

Provide playbooks for lost signer access, leaked stems, wrong delivery, conflicting claims, duplicate invoice, partner outage, sanctions alert, expired licence, unauthorized use and security incident.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
