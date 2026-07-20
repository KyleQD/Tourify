# Testing, Pilot, and Rollout

Phase 6 should launch through evidence-heavy pilots, not a broad self-service marketplace.

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

## Test layers

Unit tests cover classification, authority, territory, approval matrices, quote/contract versions, state machines, currency and cue validation. Integration tests cover end-to-end request-to-payment. RLS tests cover every role. Security tests cover restricted files, replay and cross-project access.

## Scenario matrix

Test one-stop sync, split publishing, label-owned master, expired mandate, cover, sample, interpolation, brand conflict, trailer extension, UGC campaign, livestream, CMO-routed public performance, foreign rights holder, AI opt-in, revoked authority, dispute during contracting and post-license amendment.

## Standards tests

Validate DDEX/CISAC fixtures, unknown versions, partial identifiers, duplicate messages, out-of-order partner events and round-trip exports.

## Pilot

Begin with 10–20 verified artists/catalogs, 3–5 experienced buyers/music supervisors, limited sync/master uses, one approved signature provider and one payment/invoice flow. No AI licensing or broad pre-cleared marketplace in the first pilot.

## Rollout gates

Require legal approval, security review, RLS proof, data restoration test, operational staffing, partner readiness, incident drill, contract template approval and successful reconciliation before expansion.

## Success measures

Complete-rights rate, response time, conversion, zero unauthorized deliveries, cue-sheet completion, invoice reconciliation, dispute frequency, artist/buyer comprehension and no regressions in the existing music system.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
