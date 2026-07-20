# Analytics, Reporting, Audit, and Service Levels

Analytics must distinguish discovery, licensing conversion, operational performance, usage and revenue while protecting confidential terms.

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

## Artist metrics

Inquiries, qualified requests, shortlist rate, quote rate, approval time, conversion, fees, usage, territories, buyer categories and unresolved blockers. Private buyer identity/brief details remain permissioned.

## Buyer metrics

Search-to-shortlist, response time, clearance completeness, quote variance, approval cycle, delivery time, cue-sheet completion and budget use. Do not expose other buyers’ confidential prices.

## Operations metrics

Queue volume/age, SLA breaches, authority gaps, partner errors, contract turnaround, delivery incidents, cue-sheet exceptions, reconciliation breaks, dispute rate and audit findings.

## Audit exports

Provide case timeline, authority snapshot, request/quote versions, approvals, contract hash, delivery log, cue sheet, usage, invoice, payment and adjustment lineage. Exports are signed and access-logged.

## Benchmark governance

Aggregated benchmarks require minimum cohorts, anonymization, opt-in/contract rights, methodology and suppression. They cannot be used to coordinate prices or reveal confidential terms.

## Service status

Publish internal health for search, signing, delivery, partner exchange and billing. Feature kill switches can disable only affected licensing capabilities without interrupting music playback.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
