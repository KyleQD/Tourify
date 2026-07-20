# Cue Sheets, Usage Reporting, Invoicing, and Royalties

Licensing value depends on accurate post-license reporting. Phase 6 connects executed grants to usage evidence, billing, cue sheets and the Phase 3 royalty ledger.

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

## Cue sheets

Capture production, episode, cue, timing, use type, duration, work title, writers, publishers, recording, artists, labels, ISWC, ISRC, societies, territories and production identifiers. Validate totals and identifiers; support Global Cue Sheet Standard 2.0 and AVR+ compatible exports where licensed.

## Usage reports

For UGC, platform, game, podcast, campaign and event uses, record URLs, dates, units, impressions, streams, territories, revenue/spend, removals, channels and licence limits. DDEX DSR UGC and audiovisual profiles can be used with partners.

## Invoice lifecycle

Generate invoice instructions from effective agreements; preserve payer, payee, tax treatment, currency, due date, line items and external provider IDs. Tourify should use approved payment providers and not commingle funds.

## Royalty handoff

Executed licence allocations and cash receipts create source records for Phase 3. The Phase 3 immutable ledger remains the accounting source of truth. Phase 6 cannot recalculate historical rights without a versioned adjustment.

## Reconciliation

Compare contracted use, reported use, invoices, cash and cue sheets. Exceptions include unreported territory, over-term use, additional cutdowns, missing cue, underpayment, incorrect identifiers and unmatched payment.

## Statements

Rights holders and participants receive statements with gross fees, deductions, taxes, allocations, payment status and source agreement. Private shares remain role-gated.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
