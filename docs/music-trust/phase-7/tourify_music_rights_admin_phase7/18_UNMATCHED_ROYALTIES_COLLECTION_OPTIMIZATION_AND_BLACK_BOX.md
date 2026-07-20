# Unmatched Royalties, Collection Optimization, and Black-Box Recovery

## Purpose

Help artists identify missing registrations, unmatched recordings, unclaimed shares and collection gaps without guaranteeing recovery.

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

- Catalog health diagnostics.
- Recoverability scoring with transparent assumptions.
- Claim queues and aging.
- Collection cost-versus-benefit controls.

## Architecture and source-of-truth rules

- Unmatched estimates are not receivables.
- Recovery windows, source rules and fees differ by provider.
- Historical data corrections may not produce payment.

## Primary workflows

### Opportunity discovery

1. Compare verified catalog to official registrations and statements.
2. Identify missing/partial matches and claims.
3. Estimate eligible periods and controlled shares.
4. Score evidence and cost.

### Recovery campaign

1. Prioritize approved opportunities.
2. Submit corrections/claims.
3. Track aging and follow-up.
4. Reconcile actual recoveries.
5. Update model performance.

## Data and state requirements

- Opportunity source, estimated range, limitation/aging date, controlled share, evidence, cost, status and actual recovery.

## Controls and stop conditions

- Do not display a single guaranteed recovery value.
- Require user approval for fee-bearing services.

## Existing-system integration

- Use Phase 3 statements, Phase 2 catalog and official-source mirrors.

## Testing requirements

- No statement history, duplicate opportunity, expired claim and partial recovery tests.

## Exit criteria

- Recovered amounts are separated from estimates.
- Model accuracy is monitored and disclosed.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
