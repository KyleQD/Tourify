# Phase 6 Non-Destructive Integration Checklist

Use this checklist before every migration, route, component, worker, provider integration and rollout.

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

## Repository

Audit actual paths, imports, route helpers, Supabase clients, generated types, feature flags, tests, app chrome, account permissions and mobile behavior. Reuse existing conventions and shared services.

## Database

No reset, drop, rename, type rewrite or destructive backfill. New objects are additive; foreign keys match deployed types; indexes are concurrent/controlled where necessary; validation queries accompany migrations.

## Music

Do not replace `artist_music`, upload URL routes, private bucket, preview jobs, marketplace sync, `resolveMusicAccess`, stream route, Jukebox, mobile player, likes, library, playlists, feed, profile, EPK or analytics.

## Rights

Licensing references Phase 2 versioned rights and authority. It does not write ownership through licensing APIs. Executed derivative terms produce proposed/versioned rights changes through the Phase 2 workflow.

## Finance

Invoices and receipts feed Phase 3 through events/reconciliation. Licensing does not modify immutable ledger entries. Payments use approved providers.

## Rollout

Everything is behind account/territory/feature flags with kill switches. Existing pages render when Phase 6 is disabled. Rollback disables new actions without deleting records.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
