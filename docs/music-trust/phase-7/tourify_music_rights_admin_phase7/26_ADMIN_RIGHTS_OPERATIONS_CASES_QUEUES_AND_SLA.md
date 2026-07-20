# Admin Rights Operations, Cases, Queues, and SLAs

## Purpose

Create operational controls for registration, claims, enforcement, disputes, deadlines and partner exceptions.

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

- Role-separated queues.
- Deadline and statutory-window monitoring.
- Dual approvals for material actions.
- Workload and quality reporting.

## Architecture and source-of-truth rules

- Operations staff cannot silently edit claims or agreements.
- Legal actions require the approved role.
- Sensitive cases are compartmentalized.

## Primary workflows

### Case review

1. Claim case lease.
2. Verify evidence and mandate.
3. Run checklist.
4. Approve, request information, reject or escalate.
5. Record reason.

### SLA management

1. Calculate deadlines.
2. Escalate approaching breach.
3. Reassign or pause with reason.
4. Report outcomes.

## Data and state requirements

- Queue, priority, owner, required role, SLA, checklist version, decision and quality review.

## Controls and stop conditions

- No self-approval above threshold.
- High-risk claimants receive enhanced review.
- Deadline changes preserve original values.

## Existing-system integration

- Extend existing admin music moderation rather than creating unrelated admin architecture.

## Testing requirements

- Role separation, queue lease, concurrent reviewer, SLA escalation and emergency-stop tests.

## Exit criteria

- Every action has accountable owner and deadline.
- Quality sampling detects erroneous claims.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
