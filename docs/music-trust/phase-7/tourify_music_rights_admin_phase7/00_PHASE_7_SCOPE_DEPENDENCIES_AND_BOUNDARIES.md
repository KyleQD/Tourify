# Phase 7 — Scope, Dependencies, and Boundaries

## Purpose

Define the production boundary for ongoing global rights administration, registration orchestration, usage claims, collections and enforcement after Phase 6 licensing is proven.

## Phase boundary

- Preserve `artist_music` as the canonical upload/catalog row and preserve the existing private `artist-music` bucket, stream route, `resolveMusicAccess`, Jukebox, mobile player, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database. Use additive migrations, explicit backfills, versioned records, feature flags, audit events and compensating actions.
- A Rights Passport is evidence. It is not an administration mandate, collection authority, litigation authorization or platform-claim entitlement.
- Separate composition, sound recording, performer/neighbouring, name/likeness/voice, lyrics, artwork, trademark, union/reuse and privacy rights.
- External registries, CMOs, administrators, platforms and courts remain authoritative for their own records. Tourify stores reconciled, versioned mirrors and submission evidence.
- Default to manual review when authority, identity, shares, territory, term, exclusivity, claim policy, registration status or evidence is incomplete, disputed or expired.
- No automated takedown, monetization claim, ownership assertion or legal threat may be sent solely from fingerprint similarity, metadata matching or AI confidence.
- Every external submission, correction, claim, notice, dispute, recovery and status update must be idempotent, signed where applicable, versioned and auditable.

## Required outcomes

- A rights-administration case model that never mutates Rights Passport history.
- Mandate-gated registration, correction, collection and enforcement workflows.
- Clear separation between Tourify technology services and legal, fiduciary, CMO, publisher, label and counsel roles.
- An explicit Phase 7 rollout sequence with stop conditions.

## Architecture and source-of-truth rules

- Phase 2 Rights Passport versions remain immutable evidence inputs.
- Phase 3 royalty ledger remains the accounting source of truth.
- Phase 6 licenses and usage reports remain immutable historical facts.
- Phase 7 creates administration cases, external submissions and enforcement matters linked to those sources.

## Primary workflows

### Prerequisite gate

1. Audit Phases 1–6 as implemented.
2. Confirm active mandates, provider agreements and operational owners.
3. Run regression baseline.
4. Enable Phase 7 only for approved accounts and territories.

### Case lifecycle

1. Create case from verified asset/right scope.
2. Resolve authority and mandate.
3. Collect evidence and external-source identifiers.
4. Submit or act through an approved provider.
5. Reconcile official result.
6. Close, suspend or reopen through versioned transitions.

## Data and state requirements

- Administration cases reference canonical asset and party IDs.
- Every external record includes source, provider ID, submitted payload hash, response hash and effective dates.
- No Phase 7 object may overwrite Phase 2–6 source records.

## Controls and stop conditions

- Disable the workflow when mandate or authority expires.
- Block action when claims are disputed or exceed controlled shares.
- Require legal approval for litigation, settlement releases or rights transfer documents.

## Existing-system integration

- Reuse existing identity, organization, notification, document, payment and audit infrastructure where audited.
- Add new routes under `app/api/**` and shared helpers under `lib/music/rights-admin/`.

## Testing requirements

- Phase 1–6 regression suite.
- RLS and route authorization matrix.
- Idempotency and compensating-action tests.

## Exit criteria

- Approved source-of-truth ADRs exist.
- No Phase 7 action can create implied authority.
- Kill switches disable all external submissions without deleting evidence.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
