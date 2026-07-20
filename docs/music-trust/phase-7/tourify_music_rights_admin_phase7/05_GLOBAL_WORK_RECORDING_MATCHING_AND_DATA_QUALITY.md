# Global Work–Recording Matching and Data Quality

## Purpose

Link musical works, sound recordings, releases and usage records across external systems while preserving uncertainty and human review.

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

- Deterministic and probabilistic matching tiers.
- Explainable match evidence.
- Conflicting identifier and duplicate queues.
- Quality scores that do not create ownership.

## Architecture and source-of-truth rules

- Exact identifier matches are strong evidence but still require version/asset checks.
- Audio fingerprint matches identify likely recordings, not composition ownership.
- Human approval is required above defined risk thresholds.

## Primary workflows

### Match generation

1. Normalize titles, parties, identifiers, durations and versions.
2. Generate candidate pairs.
3. Score identifiers, metadata, audio and release relationships.
4. Apply thresholds.
5. Queue ambiguous candidates.

### Match approval

1. Reviewer inspects evidence.
2. Approve, reject or split candidate.
3. Record reason and model/rule version.
4. Notify downstream registration and usage processes.

## Data and state requirements

- Candidate features, score, rule/model version, evidence links, reviewer, resolution and superseded match links.

## Controls and stop conditions

- Do not collapse clean/explicit, remix, live, remaster or cover versions.
- Block automated claims from low-confidence matches.

## Existing-system integration

- Reuse existing acoustic fingerprints and origin manifests.
- Publish approved mappings to Phase 3 matching interfaces.

## Testing requirements

- Version collisions, homonymous writers, transliteration, alternate titles and remaster tests.

## Exit criteria

- Approved matches are reproducible and reversible.
- Data quality dashboards expose unresolved high-impact records.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
