# Rights Reversion, Termination, and Contract-Expiry Monitoring

## Purpose

Monitor contractual expirations and statutory termination opportunities without presenting automated calculations as legal advice.

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

- Grant and license deadline calendar.
- Section 203/304 candidate calculations.
- Notice and recordation evidence tracking.
- Successor-controller transitions.

## Architecture and source-of-truth rules

- Termination eligibility is fact-specific and counsel-reviewed.
- Work-made-for-hire and will exceptions are surfaced.
- Existing licenses and derivative-work effects require legal analysis.

## Primary workflows

### Deadline monitoring

1. Capture grant execution/publication facts.
2. Calculate candidate windows with rule version.
3. Notify rights holder years before deadlines.
4. Require counsel review.

### Effective transition

1. Record served and recorded notices.
2. Verify effective date.
3. Create successor claim/authority version.
4. Notify administrators and licensees.
5. Do not rewrite historical licenses.

## Data and state requirements

- Grant document, execution date, publication facts, governing section, candidate window, notice service, recordation and effective transition.

## Controls and stop conditions

- No “you have recovered your rights” status without verified effective event.
- Deadline calculation changes require model versioning.

## Existing-system integration

- Reference Phase 2 agreements and Phase 6 licenses; create new future-effective claims.

## Testing requirements

- Multiple authors, heirs, work-made-for-hire, publication grant and missed-window tests.

## Exit criteria

- Artists receive explainable reminders and counsel referral.
- Historical rights and ledger records remain unchanged.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
