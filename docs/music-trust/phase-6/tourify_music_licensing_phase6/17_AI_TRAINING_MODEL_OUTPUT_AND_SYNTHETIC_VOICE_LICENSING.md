# AI Training, Model Output, and Synthetic Voice Licensing

AI licensing is a distinct, opt-in exchange. An artist’s upload, Rights Passport, certification, public availability, sync availability or subscription never authorizes training, fine-tuning, embedding, feature extraction, voice cloning or model outputs.

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

## Separate licence classes

Model pretraining, fine-tuning, retrieval/indexing, embeddings, evaluation, research, commercial model, internal model, source separation, music generation, voice model, style/reference, output similarity controls and dataset redistribution separately.

## Required terms

Capture exact assets/versions, dataset size, model/provider, purpose, training location, retention, security, subcontractors, weights ownership, output restrictions, attribution, compensation, audit, deletion, incident notice, opt-out handling, model release, territory, term and prohibited uses.

## Synthetic identity

Voice, likeness, persona and style-related permissions are separate from composition and master rights. A controller cannot license another person’s voice or identity unless the authority record covers it.

## EU reservation support

Publish machine-readable rights reservations for publicly accessible content and preserve asset-level policy. The policy layer can implement TDMRep-compatible discovery, while clearly stating that TDMRep is a community specification and legal effect depends on jurisdiction.

## No default marketplace

AI catalogue search must show `not_available` unless every required party opted in. Silence is refusal. Rights holders can revoke future availability; existing executed terms govern already authorized use.

## Monitoring and evidence

Record delivered dataset manifests, hashes, recipients, model declarations, reports, audits and deletion certificates. Tourify cannot guarantee a model did not use unlicensed data but can create evidence and enforcement workflows.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
