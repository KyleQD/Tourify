# Pricing, Quote Governance, and Commercial Terms

Tourify may provide pricing tools and benchmarks, but price remains a rights-holder or authorized representative decision unless a signed pre-clearance mandate defines rules.

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

## Pricing inputs

Media, territory, term, prominence, duration, production budget, paid spend, brand category, exclusivity, artist/catalog demand, rights completeness, edit rights, options, delivery, union/reuse and precedent can inform a range.

## Pricing modes

Support inquiry-only, fixed pre-cleared price, rules-based price envelope, human quote, auction/competitive quote and managed negotiation. Automated prices must expose assumptions and approval source.

## Commercial components

Model master fee, sync fee, mechanical, production/delivery fee, administration fee, minimum guarantee, backend/royalty, most-favored-nations, expenses, taxes, withholding, payment schedule, late fees, renewals and options separately.

## MFN and parity

MFN obligations identify comparator parties, terms, scope and trigger. The system alerts on inconsistent terms but does not rewrite contracts automatically.

## Currency and validity

Quotes use a base currency, FX reference date/source, tax assumptions and expiration. FX movements do not silently modify an accepted quote.

## Governance

Pricing recommendations are versioned, tested for bias and separated from valuation. Tourify cannot imply that a higher catalog valuation is a guaranteed license price.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
