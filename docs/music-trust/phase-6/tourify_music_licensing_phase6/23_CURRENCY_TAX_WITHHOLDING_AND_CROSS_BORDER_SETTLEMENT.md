# Currency, Tax, Withholding, and Cross-Border Settlement

Phase 6 must route financial obligations correctly without presenting Tourify as the artist’s tax adviser or unlicensed money transmitter.

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

## Payment roles

Identify licensee/payer, licensor/payee, collection agent, administrator, marketplace fee recipient, tax withholding agent and payment provider. The agreement and provider define who receives and distributes cash.

## Tax documentation

Collect W-9 or appropriate W-8 series documentation through secure provider workflows when required. Store status and expiry, not unnecessary tax data in general licensing tables.

## Withholding

Model source country, income category, beneficial owner, treaty claim, rate, amount withheld and reporting form. U.S.-source royalties paid to foreign persons may require Chapter 3 withholding and Forms 1042/1042-S; counsel/tax providers configure rules.

## Currencies and FX

Quotes, invoices, cash and royalties preserve original currency and integer minor units. FX conversions record source, timestamp, rate and rounding. Reconciliation never substitutes a current FX rate for the transaction rate.

## Sanctions and prohibited territories

Screen parties and payments through approved providers where required. A sanctions alert blocks payment and may block contracting/delivery under documented policy.

## Settlement

Use provider-hosted payment, escrow or invoicing where appropriate. Webhooks are signed, idempotent and reconciled. Tourify must not mark a licence paid solely from a browser redirect.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
