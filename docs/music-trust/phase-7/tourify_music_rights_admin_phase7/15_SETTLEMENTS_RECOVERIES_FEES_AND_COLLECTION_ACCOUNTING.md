# Settlements, Recoveries, Fees, and Collection Accounting

## Purpose

Record negotiated resolutions and recovered funds while keeping cash, tax, allocations and payouts in Phase 3.

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

- Versioned settlement proposals and approvals.
- Release and confidentiality terms.
- Recovery fee calculation.
- Deterministic ledger handoff.

## Architecture and source-of-truth rules

- A settlement is effective only when executed and conditions are met.
- Tourify cannot accept or compromise claims beyond mandate authority.
- Settlement accounting is separate from claim estimates.

## Primary workflows

### Settlement

1. Create proposal tied to matter and rights.
2. Verify authority thresholds.
3. Negotiate through approved users/counsel.
4. Execute agreement.
5. Track payment and nonmonetary obligations.

### Recovery

1. Receive provider/bank confirmation.
2. Reconcile gross, fees, withholding and net.
3. Import Phase 3 ledger batch.
4. Allocate by approved rights snapshot.
5. Issue statements.

## Data and state requirements

- Proposal versions, approval limits, settlement amount, fees, confidentiality, releases, payment schedule and ledger links.

## Controls and stop conditions

- Dual approval for material settlements.
- No client-side success redirect establishes payment.
- No release beyond exact defined claims.

## Existing-system integration

- Reuse Phase 3 payment, tax, ledger, statements and payout readiness.

## Testing requirements

- Partial payments, installment default, fee cap, withholding and disputed allocation tests.

## Exit criteria

- Settlement documents and funds reconcile exactly.
- Nonmonetary obligations are tracked to closure.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
