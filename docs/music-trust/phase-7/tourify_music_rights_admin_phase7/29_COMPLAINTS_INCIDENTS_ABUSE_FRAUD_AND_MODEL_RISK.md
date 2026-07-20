# Complaints, Incidents, Abuse, Fraud, and Model Risk

## Purpose

Handle platform complaints, fraudulent ownership claims, compromised accounts, provider incidents and matching/model failures.

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

- Unified complaint intake.
- Incident severity and containment.
- Fraud indicators and account holds.
- Model/rule version rollback.
- Postmortems and remediation.

## Architecture and source-of-truth rules

- Safety incidents can stop external submissions globally or by provider.
- Fraud indicators do not replace investigation.
- Model changes are governed and reversible.

## Primary workflows

### Incident

1. Detect or receive report.
2. Classify severity and affected cases.
3. Activate kill switch or holds.
4. Investigate and communicate.
5. Restore cautiously.
6. Publish internal postmortem.

### Model issue

1. Identify elevated false positives or drift.
2. Disable affected automation.
3. Reprocess impacted candidates.
4. Notify users where action changed.

## Data and state requirements

- Complaint, incident, affected records, timeline, containment, root cause, remediation and notification.

## Controls and stop conditions

- Emergency action cannot delete evidence.
- Compromised credentials are revoked immediately.
- Affected claims are reviewed before reactivation.

## Existing-system integration

- Integrate with platform incident and account security systems.

## Testing requirements

- Credential compromise, provider breach, false-positive spike, duplicate notices and insider abuse tests.

## Exit criteria

- Kill switches are tested.
- Incident drills include legal, security and operations owners.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
