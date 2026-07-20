# Product Model and User Journeys

## Purpose

Define artist, representative, administrator, reviewer and enterprise workflows for managing rights after music is uploaded, certified and licensed.

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

- Artist-facing catalog health and recovery workspace.
- Representative and administrator mandate workflows.
- Rights Operations queues for exceptions and disputes.
- Enterprise APIs for approved catalogs and partners.

## Architecture and source-of-truth rules

- The product exposes service status, not legal conclusions.
- Users see separate composition, master and neighboring-right administration states.
- Official external status is always labeled by source and retrieval date.

## Primary workflows

### New artist administration

1. Select catalog or track.
2. Choose registration/collection goals.
3. Complete mandate and identity checks.
4. Review proposed submissions.
5. Authorize submission.
6. Track results and exceptions.

### Existing catalog recovery

1. Import official and provider records.
2. Match works and recordings.
3. Identify missing registrations, unmatched usage and conflicting claims.
4. Open correction or claim cases.
5. Reconcile recovered revenue through Phase 3.

### Enforcement matter

1. Report suspected infringement.
2. Preserve evidence.
3. Validate authority and exceptions.
4. Choose platform claim, notice, settlement outreach or counsel referral.
5. Track dispute and outcome.

## Data and state requirements

- Dashboard statuses include not_started, needs_authority, ready, submitted, accepted, rejected, conflict, disputed, collected and closed.
- Every recommendation includes rationale, data source and confidence.

## Controls and stop conditions

- Never label a user as an infringer based only on a match.
- Never market estimated recoveries as guaranteed.
- Never send legal communications without the correct approval tier.

## Existing-system integration

- Add tabs to existing artist music and Rights Passport workspaces rather than replacing them.
- Use current notifications and team permissions after audit.

## Testing requirements

- Journey tests for solo artist, co-writers, label-owned masters, publisher-administered works, samples and inherited catalogs.

## Exit criteria

- Artists can understand what Tourify can do, what requires a partner and what requires counsel.
- Existing uploads remain usable without Phase 7 enrollment.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
