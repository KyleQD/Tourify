# Security, Privacy, Evidence Chain, and Legal Holds

## Purpose

Protect unreleased music, identities, legal records, counter-notices, settlements, monitoring evidence and partner credentials.

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

- Data classification and least privilege.
- Evidence hashing and export manifests.
- Legal holds and retention exceptions.
- Key and secret rotation.
- Incident response.

## Architecture and source-of-truth rules

- Privileged, identity and counter-notice data are highly restricted.
- Evidence integrity does not prove legal conclusions.
- Monitoring and scraping must be lawful and minimized.

## Primary workflows

### Evidence capture

1. Acquire through approved method.
2. Hash file and metadata.
3. Record source/time/tool.
4. Store immutable version.
5. Limit access.

### Legal hold

1. Receive verified instruction.
2. Apply hold to exact records.
3. Suspend deletion.
4. Audit access/export.
5. Release only with approval.

## Data and state requirements

- Classification, encryption, access events, hash, chain-of-custody entries, hold scope, retention and deletion result.

## Controls and stop conditions

- No public bucket for evidence.
- No durable signed URLs.
- No broad employee access.
- No raw secrets in logs.

## Existing-system integration

- Use existing security and audit tooling where proven.

## Testing requirements

- Unauthorized access, expired URL, tamper detection, hold, deletion and key-rotation tests.

## Exit criteria

- Independent security review has no critical unresolved issue.
- Evidence exports can be independently verified.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
