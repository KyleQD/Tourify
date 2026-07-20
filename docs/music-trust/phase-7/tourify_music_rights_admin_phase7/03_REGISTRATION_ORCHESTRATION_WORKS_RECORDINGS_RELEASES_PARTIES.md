# Registration Orchestration for Works, Recordings, Releases, and Parties

## Purpose

Create controlled submission workflows for copyright, CMO, publisher, label, MLC, SoundExchange and identifier systems without treating Tourify as the official registry.

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

- Submission packages generated from verified canonical metadata.
- Provider-specific validation and acknowledgments.
- Manual review for corrections and conflicting records.
- Official-source reconciliation after submission.

## Architecture and source-of-truth rules

- Tourify internal IDs remain stable.
- External IDs and registration numbers are versioned attributes.
- Each target registry has its own eligibility, field and authority rules.

## Primary workflows

### Registration preparation

1. Select target registry and repertoire.
2. Validate required identifiers and party data.
3. Resolve controlled shares and mandate.
4. Generate target-specific payload.
5. Obtain final user approval.

### Submission and result

1. Send through approved adapter or export file.
2. Store request hash and provider receipt.
3. Poll or receive signed callback.
4. Classify accepted, accepted_with_changes, rejected or pending_review.
5. Reconcile official fields without overwriting history.

## Data and state requirements

- Registration batch, item, target, payload version, official source ID, validation errors, acknowledgment codes, submitted/accepted dates and current reconciliation status.

## Controls and stop conditions

- No automatic submission from draft Rights Passports.
- Require duplicate search when target supports it.
- Block incompatible or overclaimed shares.

## Existing-system integration

- Use Phase 2 works, recordings, releases, parties and identifiers as inputs.
- Send accepted external IDs back as linked registrations, not primary keys.

## Testing requirements

- Duplicate submissions, partial acceptance, retry, timeout and accepted-with-change tests.

## Exit criteria

- At least one sandbox/file-export workflow works end to end.
- Official responses can be reproduced from stored evidence.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
