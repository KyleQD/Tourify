# Security, Privacy, Confidentiality, and Abuse Controls

Phase 6 handles unreleased music, scripts, rough cuts, commercial campaigns, legal documents and financial data, making it a high-value target.

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

## Threat model

Cover account takeover, buyer impersonation, unreleased asset theft, insider access, URL leakage, scraper abuse, malicious uploads, webhook forgery, signature replay, approval manipulation, contract substitution, invoice fraud, partner compromise and denial of service.

## Controls

Require MFA/step-up for signing and delivery, short-lived signed URLs, content scanning, encryption, strict RLS, network/server key isolation, audit logs, anomaly alerts, download limits, watermarking, session revocation and device/session evidence.

## Confidentiality

NDA acceptance, project labels, need-to-know access, view-only modes, watermark overlays, download expiry and export controls protect buyer and artist materials. Search indexes contain sanitized fields only.

## Secrets and keys

Initialize SDKs lazily server-side, store secrets in managed environment/key systems, separate signature/payment/storage keys, rotate and revoke, and prohibit client exposure of service-role or provider secrets.

## Abuse

Detect bulk scraping, fake briefs, phishing, spam requests, coercive terms, discriminatory filtering, impersonation, unauthorized reference uploads and repeated rights misrepresentation. Enforcement includes rate limits, review, suspension and appeal.

## Incident evidence

Preserve immutable logs, affected assets, access history, webhook payloads and delivery manifests. Notify parties according to contract and law.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
