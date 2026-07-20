# Legal Escalation, Copyright Claims Board, Counsel, and Litigation Boundary

## Purpose

Define when Tourify stops automated operations and transfers a matter to qualified counsel or an approved dispute forum.

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

- Legal escalation matrix.
- CCB information and evidence export.
- Counsel assignment and privilege controls.
- Court/order intake without Tourify giving legal advice.

## Architecture and source-of-truth rules

- Tourify does not file litigation or provide legal advice unless separately authorized through counsel.
- CCB participation is voluntary and subject to its rules and damage limits.
- Court orders override product workflow only after verification.

## Primary workflows

### Escalation

1. Detect legal trigger or unresolved high-value dispute.
2. Freeze automated actions.
3. Package evidence and timeline.
4. Assign counsel/provider.
5. Track external matter status.

### Order intake

1. Verify issuing authority and authenticity.
2. Map exact scope.
3. Apply narrow action.
4. Notify authorized parties.
5. Record compliance and challenge status.

## Data and state requirements

- Matter type, forum, deadlines, counsel, privilege marker, evidence export hash, orders and resolution.

## Controls and stop conditions

- Privileged files in separate restricted storage.
- No AI-generated legal filing without attorney review.
- No action beyond verified order scope.

## Existing-system integration

- Use existing legal-hold and restricted-document controls after audit.

## Testing requirements

- CCB referral, federal action notice, subpoena/order and privilege-access tests.

## Exit criteria

- Counsel can receive a complete immutable evidence package.
- Product teams cannot access privileged content by default.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
