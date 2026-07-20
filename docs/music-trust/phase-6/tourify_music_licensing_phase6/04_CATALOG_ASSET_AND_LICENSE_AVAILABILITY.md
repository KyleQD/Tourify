# Catalog, Asset, and License Availability

Availability is a versioned assertion about a specific right and use, not a general “available for licensing” checkbox.

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

## Availability object

For each composition, recording, release, stem, lyric, artwork or identity right, store right category, controller, authority source, territory, validity period, permitted media/use, exclusions, approval policy, minimum lead time, delivery constraints, quote policy, exclusivity status and evidence confidence.

## Availability statuses

Use `not_configured`, `inquiry_only`, `pre_cleared`, `quote_required`, `approval_required`, `temporarily_unavailable`, `territory_restricted`, `conflicted`, `expired`, and `unavailable`. Public discovery may show only a simplified status; internal clearance preserves reasons and evidence.

## Pre-cleared limitations

“Pre-cleared” means all required controllers have approved a defined ruleset and price/term envelope. A request outside that envelope becomes approval-required. Pre-clearance must have an expiration date and cannot survive a rights transfer or material dispute without revalidation.

## Catalog groups

Allow rights holders to create licensing collections such as one-stop, instrumental, clean, explicit, holiday, sports, trailer, local-market, emerging-artist and commissioned catalogs. Collections reference canonical assets; they do not duplicate audio or ownership records.

## Sensitive assets

Unreleased tracks, stems, acapellas and high-resolution masters default to private. Discovery may use watermarked previews or metadata-only cards. Delivery occurs only after an approved request or controlled evaluation grant.

## Revalidation triggers

Revalidate availability when a Rights Passport is superseded, a claim is disputed, a mandate changes, a catalog transfer closes, a contributor becomes a minor/estate issue, a license creates exclusivity, or a legal hold is entered.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
