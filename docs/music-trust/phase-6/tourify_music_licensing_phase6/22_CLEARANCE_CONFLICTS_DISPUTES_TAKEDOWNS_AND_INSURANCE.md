# Clearance Conflicts, Disputes, Takedowns, and Insurance

A licensing exchange must surface uncertainty rather than bury it.

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

## Conflict types

Ownership overclaims, mandate conflicts, revoked authority, exclusivity collisions, sample claims, estate/minor issues, unauthorized derivative uses, missing approvals, scope disputes, payment disputes and usage beyond licence are separate case types.

## Effect

A blocking conflict can hide availability, pause quotes, prevent effectiveness, stop delivery, suspend future use, issue expiration/takedown notices and hold disputed allocations. Existing licences are reviewed under their terms rather than automatically voided.

## Case workflow

Support intake, claimant identity, affected rights/assets, evidence, notices, response deadlines, internal notes, counsel/insurer routing, proposed resolution, decision source, appeals and closure. Staff cannot adjudicate substantive ownership absent approved authority.

## Takedowns

External takedown requests are routed to the correct platform, distributor, buyer or partner. Tourify’s DMCA workflow remains distinct from contractual licence enforcement but can share evidence and repeat-abuse controls.

## Insurance

Clearance/E&O insurance integrations may collect underwriting data and proof of coverage. Tourify does not bind coverage, interpret exclusions or promise claim payment unless licensed and contracted to do so.

## Preservation

All conflicting versions, agreements, communications and delivery records are preserved under legal hold. Public pages show narrow neutral status language.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
