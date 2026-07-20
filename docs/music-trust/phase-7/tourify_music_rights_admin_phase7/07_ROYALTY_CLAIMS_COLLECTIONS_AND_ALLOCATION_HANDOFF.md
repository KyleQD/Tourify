# Royalty Claims, Collections, and Allocation Handoff

## Purpose

Create and manage claims for unpaid or unmatched uses while keeping official accounting and allocations in Phase 3.

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

- Claim eligibility and authority checks.
- Submission and dispute states.
- Expected-versus-received reconciliation.
- Recovery and fee handoff to Phase 3.

## Architecture and source-of-truth rules

- A claim case is not revenue.
- Only verified cash/statement events enter the Phase 3 ledger.
- Fee deductions and collection commissions follow the active mandate and agreement.

## Primary workflows

### Claim creation

1. Select usage and controlled right/share.
2. Verify mandate and limitation periods.
3. Calculate claim basis with transparent assumptions.
4. Approve submission.
5. Send to provider or counterparty.

### Collection receipt

1. Receive official decision and payment detail.
2. Reconcile to claim items.
3. Create Phase 3 import with source documents.
4. Allocate using historical rights snapshot.
5. Close or appeal remaining difference.

## Data and state requirements

- Claim amount, currency, periods, controlled share, authority version, limitations deadline, submitted evidence, response, recovery and ledger batch IDs.

## Controls and stop conditions

- No client-side amount is authoritative.
- No recovered cash is distributed outside approved payment and tax controls.

## Existing-system integration

- Integrate with Phase 3 ledger, allocations, holds, statements and payouts.

## Testing requirements

- Partial recovery, multi-currency, disputed share, stale mandate and duplicate recovery tests.

## Exit criteria

- Every collected amount reconciles to a provider source and ledger entry.
- Unresolved claim portions remain visible.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
