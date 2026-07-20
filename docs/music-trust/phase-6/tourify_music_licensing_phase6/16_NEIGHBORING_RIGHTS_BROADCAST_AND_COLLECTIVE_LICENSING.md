# Neighbouring Rights, Broadcast, and Collective Licensing

This module records where direct licensing ends and collective, statutory or reciprocal administration begins.

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

## Rights and organizations

Track performers, phonogram producers, music licensing companies, PROs, CMOs, MROs, neighbouring-right societies, mandates, reciprocal representation and eligible territories. Do not collapse them into one “society” field.

## Broadcast and noninteractive use

Radio, television, background music, noninteractive streaming, simulcast, retransmission and private-copy remuneration may use statutory or collective systems depending on territory. Tourify records the pathway, repertoire claim and reporting evidence; approved partners grant or administer the licence.

## RDR alignment

Use DDEX RDR-N for recording/performer rights data, RDR-C for exchange, RDR-R for revenues and RDR-RCC for conflict workflows where partners support them.

## CMO mandates

A right holder may mandate different societies or administrators by right and territory. Availability reflects the mandate and directs the buyer to the correct route instead of showing a direct Tourify checkout.

## Conflict handling

Competing claims, ineligible recordings, repertoire gaps and reciprocal-right questions create a partner/manual status. They are not silently resolved by a Tourify reviewer.

## Revenue handoff

Usage and revenue reports synchronize to Phase 3 while preserving the reporting society, territory, right category, deductions and distribution period.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
