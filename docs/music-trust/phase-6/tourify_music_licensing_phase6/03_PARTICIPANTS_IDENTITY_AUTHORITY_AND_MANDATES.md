# Participants, Identity, Authority, and Mandates

Licensing depends on knowing who can speak for each right. Phase 6 extends Phase 2 parties and representatives with buyer organizations, music supervisors, agencies, production companies, brands, platforms, CMOs, publishers, labels, administrators and licensing agents.

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

## Participant roles

Model rights holders, controllers, administrators, collection agents, approvers, licensors, licensees, producers, agencies, music supervisors, legal representatives, payers, delivery recipients, insurers and reporting parties separately. One organization may hold several roles for different rights or territories.

## Authority records

An authority record identifies principal, representative, rights category, assets/catalog scope, territories, term, exclusivity, ability to quote, ability to approve, ability to sign, ability to collect, delegation rights, limitations, source agreement and revocation status. Authority expires automatically and is never inferred from a profile role.

## Buyer verification

Public browsing can be limited to marketing fields. Confidential audio, lyrics, stems, pricing and controller data require verified organization identity, accepted buyer terms, named project, role-based access and, where appropriate, an NDA. High-risk uses require enhanced business verification.

## Conflicts and competing mandates

Overlapping exclusive mandates, revoked representatives, estates, catalog transfers, publisher changes and territory conflicts create a clearance hold. The platform shows a neutral conflict state and routes evidence to Operations; it does not pick a winner.

## Delegation

Delegation requires a recorded chain from the principal and must be limited to the original mandate. Subagents cannot extend territory, term, right type or signing authority. Every delegated action records the authority version used.

## Identity protection

Legal names, addresses, tax forms, signatures and identity evidence remain restricted. Buyer-facing pages use approved public identities and contact channels.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
