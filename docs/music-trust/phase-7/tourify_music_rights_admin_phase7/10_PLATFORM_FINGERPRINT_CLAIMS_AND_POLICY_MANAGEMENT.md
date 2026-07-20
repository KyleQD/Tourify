# Platform Fingerprint Claims and Policy Management

## Purpose

Manage Content ID and similar platform claims through approved rights-management partners with strict exclusivity, territory and dispute controls.

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

- Reference eligibility checks.
- Territory-specific monetize/track/block policies.
- Authorized-use allowlists.
- Claim dispute and release workflows.

## Architecture and source-of-truth rules

- A platform match is not a legal determination.
- Only exclusive rights within the claimed territory may support automated reference claims.
- Manual actions require trained human review where platform rules require it.

## Primary workflows

### Reference onboarding

1. Verify exclusive rights and clean reference eligibility.
2. Exclude samples, nonexclusive material and public-domain elements as required.
3. Deliver reference and metadata.
4. Activate approved territory policy.

### Claim review

1. Receive match.
2. Check authorized channels/licenses and false-positive risk.
3. Approve policy or release claim.
4. Handle dispute/appeal.
5. Escalate legal notice only with separate approval.

## Data and state requirements

- Platform asset IDs, references, ownership territories, policies, allowlists, claims, disputes, release reasons and revenue reports.

## Controls and stop conditions

- Never claim licensed, nonexclusive or disputed repertoire automatically.
- Suspend references with repeated false claims.

## Existing-system integration

- Use Phase 6 licenses to populate authorized-use allowlists.
- Send monetization revenue reports to Phase 3 only after official statements.

## Testing requirements

- Territory split, sample contamination, licensed creator, dispute and reference-disable tests.

## Exit criteria

- Every active reference has documented exclusive authority.
- Claims can be released quickly and audibly.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
