# Business Model, Service Tiers, and Unit Economics

## Purpose

Define sustainable artist and enterprise service tiers without creating misleading contingency, legal-service or guaranteed-recovery claims.

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

- Clear free, subscription, per-case, recovery-fee and enterprise options.
- Provider and legal costs separated.
- Artist consent to fee-bearing work.
- Service-level and refund policies.

## Architecture and source-of-truth rules

- Basic catalog health can be available without administration mandate.
- Registration or enforcement fees do not imply success.
- Contingent fees and legal fee sharing require counsel review.

## Primary workflows

### Service enrollment

1. Show scope, exclusions, estimated provider costs and fees.
2. Confirm mandate and payment authorization.
3. Activate selected rights/territories.

### Case billing

1. Record service events and third-party fees.
2. Obtain approval above thresholds.
3. Reconcile recoveries and commissions.
4. Issue transparent statements.

## Data and state requirements

- Plan, entitlement, fee schedule version, minimums, third-party costs, approval threshold and invoice links.

## Controls and stop conditions

- No hidden deduction from royalties.
- No charging for unsupported territory or service.
- No percentage-of-recovery arrangement without legal approval.

## Existing-system integration

- Reuse Tourify subscriptions, marketplace payments and Phase 3 statements where appropriate.

## Testing requirements

- Plan upgrade/downgrade, mandate termination, unsuccessful case, refund and fee-cap tests.

## Exit criteria

- Artists can distinguish software, administration, provider and legal fees.
- Unit economics include review and dispute workload.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
