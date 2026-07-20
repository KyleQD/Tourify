# APIs, Events, Background Jobs, and Partner Adapters

Phase 6 follows the existing Next.js App Router conventions: route handlers under `app/api/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports and shared helpers under `lib/music/licensing/`.

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

## API groups

Provide versioned endpoints for projects/briefs, search, availability, requests, quotes, approvals, agreements, delivery, cue sheets, usage, invoices, conflicts, verification and partner webhooks. Mutations require idempotency keys, optimistic version checks and audit events.

## Domain events

Examples: `licensing.brief.created`, `licensing.request.submitted`, `licensing.clearance.blocked`, `licensing.quote.issued`, `licensing.approval.recorded`, `licensing.agreement.executed`, `licensing.license.effective`, `licensing.delivery.released`, `licensing.cuesheet.received`, `licensing.usage.reported`, `licensing.invoice.paid`, and `licensing.conflict.opened`.

## Background jobs

Use outbox-backed jobs for search indexing, availability revalidation, approval reminders, document generation, watermarking, delivery packaging, cue validation, partner exchange, invoice reconciliation, expiry, monitoring and reporting. Jobs are idempotent with dead-letter handling.

## Partner adapters

Adapters normalize CMO, publisher, label, licensing agent, payment, signature, insurance, DDEX, cue-sheet and enterprise buyer providers behind interfaces. Persist provider IDs, requests, responses, versions and signatures.

## Webhooks

Verify signature and timestamp, prevent replay, persist raw payload securely, acknowledge quickly and process asynchronously. Unknown events are retained and alerted, not discarded.

## Playback separation

Evaluation and delivery endpoints do not replace `/api/music/stream`. Existing listener playback remains governed only by `resolveMusicAccess`; confidential licensing audio uses separate scoped access.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
