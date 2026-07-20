# UI/UX and Existing-Surface Integration

## Purpose

Add rights-administration and enforcement experiences to current artist, admin, EPK and enterprise surfaces without disrupting upload or playback.

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

- Artist catalog health dashboard.
- Per-track Administration and Protection tabs.
- Claims/recoveries timeline.
- Enterprise case queues.
- Public statuses limited to non-sensitive facts.

## Architecture and source-of-truth rules

- Keep trust, ownership, registration, collection and enforcement statuses visually distinct.
- Do not display confidential disputes or recovery estimates publicly.
- Accessibility and mobile-responsive behavior are required.

## Primary workflows

### Artist workspace

1. Open existing track.
2. Review registrations, matches, claims and deadlines.
3. Authorize actions.
4. See official responses and recovered amounts.

### Operations workspace

1. Filter by deadline, provider, risk and SLA.
2. Review evidence.
3. Approve or reject action.
4. Record escalation.

## Data and state requirements

- UI consumes versioned APIs and status enums; no direct private storage paths.

## Controls and stop conditions

- Confirm before legal/financial actions.
- Show source and “last checked” date.
- Do not use red badges implying infringement before review.

## Existing-system integration

- Extend `/artist/music`, admin music moderation and existing profile/EPK badges only where appropriate.
- Playback always uses Jukebox.

## Testing requirements

- Upload/playback regression, accessibility, loading/error, permission and responsive tests.

## Exit criteria

- A user can complete core workflows without seeing internal legal notes.
- Feature flags hide all Phase 7 navigation cleanly.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
