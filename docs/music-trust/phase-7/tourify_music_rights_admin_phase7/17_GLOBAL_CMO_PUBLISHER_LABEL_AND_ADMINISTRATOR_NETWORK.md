# Global CMO, Publisher, Label, and Administrator Network

## Purpose

Manage partner directories, reciprocal territories, repertoire mandates and service capabilities without claiming global coverage where none exists.

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

- Versioned partner capability registry.
- Territory/right/category routing.
- Reciprocal and subpublishing mandate records.
- Provider SLA and reconciliation.

## Architecture and source-of-truth rules

- Coverage is determined by contract and mandate, not marketing assumptions.
- A partner may support registration but not collection, claims or enforcement.
- Local legal and tax requirements remain jurisdiction-specific.

## Primary workflows

### Partner onboarding

1. Verify organization and agreement.
2. Define rights, territories, roles, APIs/files and SLAs.
3. Complete security and compliance review.
4. Activate limited sandbox.

### Routing

1. Resolve asset/right/territory and mandate.
2. Choose approved partner.
3. Create submission.
4. Track external result.
5. Measure SLA and quality.

## Data and state requirements

- Partner, role, rights, territories, accepted formats, credentials, SLA, fee, security review and termination status.

## Controls and stop conditions

- No routing to expired or unsupported partners.
- No partner receives repertoire outside mandate.

## Existing-system integration

- Reuse Phase 6 territory and mandate modules.

## Testing requirements

- Overlapping partner, fallback, outage, contract expiry and jurisdiction restriction tests.

## Exit criteria

- Coverage maps are accurate and dated.
- Partner termination stops data transfers.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
