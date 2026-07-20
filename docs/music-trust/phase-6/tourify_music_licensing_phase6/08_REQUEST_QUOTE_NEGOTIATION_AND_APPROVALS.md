# License Requests, Quotes, Negotiation, and Approvals

This workflow turns a buyer brief and selected asset into a complete, versioned, non-binding request and then into approved commercial terms.

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

## Request lifecycle

Use `draft`, `submitted`, `needs_information`, `under_clearance`, `quote_pending`, `quoted`, `countered`, `approval_pending`, `approved`, `rejected`, `expired`, `withdrawn`, `contracting`, `licensed`, and `cancelled`. Transitions are role- and authority-gated.

## Quote structure

A quote identifies currency, fees by clearance leg, term, territory, media, use, exclusivity, options, renewals, edit rights, payment schedule, taxes, expenses, MFN conditions, delivery, credit, cue-sheet obligations, validity period and non-binding/binding status.

## Negotiation

Parties counter with structured deltas rather than overwriting terms. Messages and attachments are retained with the version. Side agreements are prohibited unless uploaded, approved and incorporated.

## Approvals

Each approver sees the exact request and quote version, their controlled right, financial allocation if permitted, and consequences. Approval can contain conditions. Any material change reopens affected approvals.

## Expiry and holds

Quotes and approvals expire automatically. Rights disputes, exclusivity conflicts, sanctions alerts, identity failures, nonpayment, project changes or legal holds pause the request.

## No implied licence

Search results, shortlists, messages, quotes, approvals, deposits and file previews do not constitute a license. Only the executed agreement and satisfied conditions authorize use.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
