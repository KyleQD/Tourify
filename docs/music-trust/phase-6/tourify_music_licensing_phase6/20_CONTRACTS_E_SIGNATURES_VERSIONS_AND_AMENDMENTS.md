# Contracts, Electronic Signatures, Versions, and Amendments

The executed agreement—not the search result, chat, quote, payment or blockchain record—defines the licence.

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

## Template governance

Counsel-approved templates are versioned by license class, jurisdiction and party role. Templates include asset IDs, rights, use, media, territory, term, exclusivity, fees, taxes, credits, delivery, approvals, warranties, indemnities, reporting, audit, termination and dispute provisions.

## Document generation

Generate a human-readable contract from the approved request/quote snapshot. Include immutable references to Rights Passport, authority, approvals and attachments. Parties must review the complete document before signing.

## Signatures

Reauthenticate signers, confirm legal identity and authority, record consent, document hash, timestamp, IP/device/session evidence and provider reference, and deliver a copy. Wallet signatures are optional evidence, not a replacement for the legal instrument.

## Conditions precedent

A signed contract can remain `pending_effective` until payment, countersignature, insurance, final cut approval, cue-sheet setup or other conditions are satisfied. Delivery and use remain blocked until effective.

## Amendments

Material changes create an amendment linked to the original; affected approvers reapprove. Never overwrite a signed agreement. Termination, expiry and rescission are recorded as events.

## Recordation and export

Where parties choose government recordation or external contract systems, Tourify stores status and references. It does not represent that an internal record is government registration or recordation.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
