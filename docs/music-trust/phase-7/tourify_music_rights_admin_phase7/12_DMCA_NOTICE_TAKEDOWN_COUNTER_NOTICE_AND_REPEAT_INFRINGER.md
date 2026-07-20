# DMCA Notice, Takedown, Counter-Notice, and Repeat-Infringer Operations

## Purpose

Implement Tourify’s obligations as a hosting platform and separate outbound enforcement notices sent for represented rights.

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

- Current designated-agent administration.
- Inbound notice validation and expeditious response.
- Uploader notification and counter-notice handling.
- Repeat-infringer policy and reinstatement timing.
- Separate outbound notice authority workflow.

## Architecture and source-of-truth rules

- Inbound service-provider duties and outbound rightsholder enforcement are different case types.
- Every DMCA designation must be renewed and kept current.
- Counter-notice deadlines are calendar-controlled and counsel-reviewed.

## Primary workflows

### Inbound notice

1. Receive notice at designated agent.
2. Validate required elements and contact incomplete senders as required.
3. Disable access expeditiously when appropriate.
4. Notify uploader.
5. Record counter-notice window.

### Counter-notice

1. Validate required statements and identity fields.
2. Notify original sender.
3. Restore after statutory waiting period unless court action notice is received.
4. Preserve legal hold and complete audit record.

### Outbound notice

1. Verify right, authority and target material.
2. Review exceptions and misrepresentation risk.
3. Approve signer.
4. Send through platform channel.
5. Track removal, counter-notice and escalation.

## Data and state requirements

- Notice/counter-notice version, statutory fields, service timestamps, material locations, disabled objects, restoration deadline and court-action indicator.

## Controls and stop conditions

- No outbound notice from an unreviewed match.
- No public disclosure of counter-notice personal data.
- Repeat-infringer actions require documented policy application.

## Existing-system integration

- Integrate with existing upload moderation and storage visibility flags using reversible access disablement.

## Testing requirements

- Incomplete notice, valid notice, counter-notice, court-action hold, restoration and repeat-infringer tests.

## Exit criteria

- Tourify agent information is current and renewal is monitored.
- Every removal and restoration is time-stamped and reversible where legally allowed.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
