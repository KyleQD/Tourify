# Phase 6 Product Model and User Journeys

The product has four connected workspaces: Rights Holder Licensing, Buyer/Music Supervisor, Contributor Approval, and Licensing Operations. Each workspace uses the same verified assets and authority graph but exposes different data and actions.

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

## Artist and rights-holder journey

An artist selects certified tracks, reviews composition/master controllers, declares availability, sets exclusions and approval rules, chooses inquiry-only or pre-cleared status, assigns representatives, and publishes a narrow licensing profile. Requests arrive in a licensing inbox. The artist can ask questions, invite missing controllers, approve commercial terms, execute agreements, deliver approved assets, and view usage and earnings.

## Buyer and music-supervisor journey

A buyer creates a confidential project, records media, scene, brand, territory, term, budget, deadlines, exclusivity and use details, then searches only eligible catalog fields. The buyer can shortlist, request quotes, provide scene context, compare complete-rights status, negotiate, execute approved documents, obtain delivery files, submit cue sheets and usage reports, and receive invoices.

## Contributor/controller journey

Publishers, labels, writers, producers, estates, administrators and authorized representatives receive scoped approval requests. They see the exact right and commercial terms they control, not unrelated private documents. They can approve, reject, counter, delegate within an active mandate, disclose conflicts, or require manual legal review.

## Operations journey

Licensing Operations verifies completeness, routes approvals, monitors deadlines, checks authority and conflicts, generates contract packets, validates delivery, reconciles cue sheets and invoices, handles amendments, and escalates disputes. Staff cannot edit signed rights terms or approve on behalf of a controller without recorded authority.

## Existing catalog journey

Previously distributed music can be imported from Phase 2 catalog matching. Import creates draft availability only. The release remains playable through the existing Jukebox path; licensing data lives in additive Phase 6 objects and cannot alter distribution or playback without a separate authorized action.

## Commercial tiers

Artists may receive basic inquiry listings with Artist+ and advanced clearance, data-room, team, reporting and protection features with Artist Pro or enterprise plans. Buyer pricing can combine seat subscriptions, request fees, completed-license fees and managed-clearance services. Fees must not be characterized as royalty ownership or legal clearance guarantees.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
