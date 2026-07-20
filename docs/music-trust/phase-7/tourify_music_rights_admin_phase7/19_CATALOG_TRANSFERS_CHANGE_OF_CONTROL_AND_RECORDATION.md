# Catalog Transfers, Change of Control, and Recordation

## Purpose

Coordinate catalog transfers, administrator changes, Letters of Direction and government recordation evidence across the Tourify ecosystem.

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

- Transfer intake and chain-of-title data room.
- Effective-date and transition plan.
- External notifications and catalog transfer messages.
- Copyright Office recordation support.

## Architecture and source-of-truth rules

- Executed transfer instruments establish rights; Tourify records evidence and status.
- Recordation is voluntary but can have legal effects; Tourify does not guarantee acceptance or priority.
- Old and new controller records coexist by effective period.

## Primary workflows

### Transfer preparation

1. Identify assets and rights.
2. Validate chain of title and exclusions.
3. Execute transfer/assignment.
4. Prepare recordation and partner notifications.

### Transition

1. Set future effective claims and mandates.
2. Send catalog transfer/LoD messages.
3. Reconcile official systems.
4. Redirect future statements.
5. Preserve prior allocations.

## Data and state requirements

- Transfer document, schedules, assets, rights, territories, effective date, recordation number, external notices and transition exceptions.

## Controls and stop conditions

- No ownership change from payment alone.
- No historical ledger rewrite.
- Require counsel for recordation certifications and redactions.

## Existing-system integration

- Connect Phase 4–5 transaction closings to Phase 2 future-effective claims and Phase 3 statement routing.

## Testing requirements

- Partial catalog, excluded rights, delayed close, rejected recordation and conflicting transfer tests.

## Exit criteria

- Every transferred asset has an effective-dated controller path.
- Official recordation and partner responses are linked.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
