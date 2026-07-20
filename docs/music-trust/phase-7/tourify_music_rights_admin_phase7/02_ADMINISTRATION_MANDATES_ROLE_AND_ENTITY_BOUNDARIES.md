# Administration Mandates, Roles, and Entity Boundaries

## Purpose

Define the written authority Tourify or a partner requires before registering, collecting, claiming, correcting or enforcing rights.

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

- Versioned mandate records by right, asset, territory, service and term.
- Authorized-signatory and beneficial-owner evidence.
- Role map distinguishing software provider, administrator, collection agent, enforcement vendor and law firm.

## Architecture and source-of-truth rules

- Mandates are separate from ownership claims and licenses.
- A party can own a right yet lack authority to administer another party’s share.
- Delegation and sub-delegation require explicit permission.

## Primary workflows

### Mandate onboarding

1. Identify principal and representative.
2. Capture right categories, repertoire, territories, services, term and exclusions.
3. Verify signing authority.
4. Execute agreement.
5. Activate only after approval and effective date.

### Mandate termination

1. Receive termination or expiry event.
2. Stop new external actions.
3. Complete or transfer pending matters according to contract.
4. Preserve historical authority evidence.
5. Notify affected users and partners.

## Data and state requirements

- Mandate IDs, versions, grants, exclusions, approval thresholds, fee terms, start/end dates, termination notice and successor administrator.

## Controls and stop conditions

- Default deny outside the exact mandate scope.
- No silent renewal.
- No collection or settlement authority inferred from registration authority.

## Existing-system integration

- Integrate with Phase 2 parties/authority and Phase 6 mandates without merging distinct purposes.

## Testing requirements

- Expired, revoked, territory-limited and conflicting mandate tests.
- Representative cannot expand principal rights.

## Exit criteria

- Every external action resolves to an active approved mandate version.
- Mandate revocation stops new actions immediately.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
