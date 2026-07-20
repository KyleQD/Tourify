# Rights-Aware Search, Discovery, and Matching

Search should improve discovery while refusing to imply that a track is clearable when required rights are missing.

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

## Search index

Index approved metadata such as genre, mood, tempo, key, instrumentation, language, era, location, themes, clean/explicit, vocal type, release state, human-origin status, availability class, one-stop status, territory, lead time and budget band. Keep confidential controller and agreement data outside the public index.

## Matching

Match a structured brief to eligible tracks using filters and explainable relevance. Semantic or audio similarity can suggest candidates, but rights completeness, exclusions, identity/voice restrictions and buyer eligibility are hard filters.

## Reference-track safety

Reference tracks may be used to describe mood or sound only when the buyer is authorized to upload them or supplies links. Tourify must not store or analyze unauthorized copyrighted masters for model training. Similarity results require messaging that they do not grant style, composition or master rights.

## Human-created preference

Buyers may filter for Human-Origin certification. Non-certified artists are not labeled AI-generated. AI-generated or AI-assisted content follows the Phase 1–2 disclosure standard and buyer requirements.

## Ranking controls

Sponsored placement, commercial relationships and editorial selections are disclosed. Rights holders cannot pay to appear “more cleared” than their evidence supports.

## Search audit

Record the brief version, filters, result identifiers, availability snapshots and reasons for exclusion so recommendations can be reproduced and disputes investigated.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
