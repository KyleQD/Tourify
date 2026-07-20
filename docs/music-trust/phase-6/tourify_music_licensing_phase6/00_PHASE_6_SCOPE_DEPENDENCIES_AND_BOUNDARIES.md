# Tourify Global Licensing and Clearance Exchange — Phase 6 Scope, Dependencies, and Boundaries

Phase 6 converts the verified catalog, authority, royalty, valuation, and institutional infrastructure from Phases 1–5 into a controlled licensing and clearance exchange. The objective is to let rights holders describe what is available, let qualified buyers request specific uses, and let all required controllers approve, contract, report, invoice, and reconcile those uses without Tourify claiming authority it does not possess.

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

## Required dependencies

Phase 6 starts only after the audited implementation confirms: safe private uploads and declarations; Rights Passport asset/party/claim/version records; human-origin and evidence workflows; royalty source and allocation snapshots; valuation provenance; marketplace identity and partner controls; institutional data-room security; and operational incident response. Missing dependencies become explicit blockers in the execution plan rather than assumptions.

## In scope

The production scope includes rights-aware discovery; license availability; buyer briefs; sync and master-use requests; mechanical and cover workflows; samples, interpolations, remixes and stems; UGC and creator campaigns; live/event and brand use; film, television, games, podcasts and trailers; neighbouring-right and CMO routing; opt-in AI licenses; quote and approval workflows; contracts; cue sheets; usage reporting; invoicing; royalty handoff; disputes; cross-border data; and enterprise integrations.

## Excluded or partner-only

Tourify does not become a PRO, CMO, MRO, record label, publisher, insurer, law firm, escrow bank, tax adviser, or compulsory-license administrator merely by building software. Blanket public-performance licensing, statutory licences, union/reuse obligations, insurance underwriting, legal opinions, and regulated payment services remain with approved parties. Permissionless sublicensing, undisclosed blanket mandates, and automatic grants from incomplete claims are prohibited.

## Launch sequence

Launch in controlled layers: internal rights availability; invitation-only music-supervisor pilot; non-binding inquiries and quote requests; human-approved sync/master licenses; cue-sheet and usage reporting; selected partner integrations; then additional licence classes. AI training, automated pricing, multi-territory direct grants, and broad self-service licensing remain separately gated.

## Phase 6 success

Success means an artist can convert a certified catalog into precise licensable inventory, a buyer can submit a complete use brief, every required controller can approve or reject, a defensible agreement can be executed, the use can be reported and billed, and revenue can flow into the Phase 3 ledger—while legacy music behavior is unchanged.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
