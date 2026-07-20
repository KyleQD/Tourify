# Rights Clearance Graph and Approval Matrix

The clearance graph determines which rights, controllers, approvals and evidence are required for a classified use. It is the core safety mechanism for Phase 6.

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

## Graph nodes and edges

Nodes include assets, rights, claims, controllers, administrators, representatives, mandates, territories, agreements, conflicts and approvals. Edges include embodies, controls, administers, represents, collects, licenses, excludes, requires-consent, transferred-to and supersedes.

## Approval matrix

For each clearance leg, compute required approvers from signed agreements and active mandates. Support unanimous approval, specified controller approval, majority approval only when a governing agreement expressly permits it, artist consultation, label consent, publisher consent, sample-source approval and third-party restrictions.

## Completion rules

A request is clearable only when every mandatory leg is satisfied, claims do not exceed allowed totals, authority covers the requested territory/term/use, approvals reference the current request version, and no blocking conflict or legal hold exists.

## Partial and unknown shares

Unknown, unclaimed, disputed or unresponsive shares remain unresolved. The system may support inquiry routing and evidence gathering but cannot automatically treat silence or missing data as consent.

## One-stop indicator

A one-stop badge is shown only when one verified party can authorize all required composition and master rights for the defined request class. It is versioned, scoped and revocable.

## Explainability

Every decision returns a machine-readable result and plain-language explanation: required rights, satisfied legs, missing approvers, evidence version, expiry, restrictions and next action. Operations can inspect but not silently override the graph.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
