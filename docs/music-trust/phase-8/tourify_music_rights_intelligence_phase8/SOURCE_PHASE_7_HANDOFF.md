# Phase 8 — Global Rights Intelligence and Collective Negotiation Readiness

## Purpose

Define a future extension that may aggregate anonymized rights intelligence, industry benchmarks, policy monitoring and opt-in collective negotiation without creating a cartel, union, CMO or legal representative by implication.

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

- Rights intelligence built from consented, governed data.
- Policy and contract benchmarking.
- Opt-in negotiation groups with antitrust and labor counsel.
- Creator education and risk alerts.

## Architecture and source-of-truth rules

- Phase 8 cannot share competitively sensitive data without controls.
- Collective licensing or bargaining requires separate legal/entity analysis.
- Artist-level confidential terms remain protected.

## Primary workflows

### Readiness

1. Prove Phase 7 data quality and consent.
2. Define anonymization and aggregation thresholds.
3. Complete antitrust/privacy review.
4. Pilot educational insights only.

## Data and state requirements

- Consent, permitted purpose, aggregation cohort, privacy thresholds, policy source and output version.

## Controls and stop conditions

- No coordinated pricing recommendations.
- No automated contract or legal advice.
- No use of enforcement data to punish nonparticipants.

## Existing-system integration

- Consume aggregate Phase 7 events without changing source cases.

## Testing requirements

- Reidentification, small cohort, stale policy and opt-out tests.

## Exit criteria

- A separate Phase 8 approval package exists.
- No collective-negotiation feature ships from Phase 7 flags.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
