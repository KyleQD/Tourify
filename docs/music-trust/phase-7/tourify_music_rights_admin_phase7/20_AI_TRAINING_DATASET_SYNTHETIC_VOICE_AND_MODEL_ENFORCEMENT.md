# AI Training, Dataset, Synthetic Voice, and Model Enforcement

## Purpose

Monitor and respond to suspected unauthorized AI training, dataset inclusion, output imitation and synthetic-voice uses while preserving legal uncertainty and explicit licensing boundaries.

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

- Separate evidence types for dataset, training, retrieval, output and voice claims.
- Opt-in license comparison.
- Model/provider notice and partner escalation.
- Technical-protection and provenance evidence.

## Architecture and source-of-truth rules

- A model output similarity score is not proof of training.
- Training legality varies by jurisdiction and facts.
- Voice, likeness, unfair competition, privacy and contract rights may differ from copyright.

## Primary workflows

### AI incident

1. Capture model, prompt/output where lawfully available, provider terms and suspected source.
2. Compare active AI licenses and reservations.
3. Preserve fingerprints/provenance.
4. Route to specialist review.

### Response

1. Choose inquiry, reservation notice, platform process, contractual claim or counsel escalation.
2. Track provider response.
3. Record settlement or closure.

## Data and state requirements

- Model/provider, claim theory, affected assets/voices, evidence, jurisdiction, license comparison, notices and outcomes.

## Controls and stop conditions

- No automated public allegation of model training.
- No reverse engineering or access violating law/terms.
- Synthetic-voice claims require verified identity/authority.

## Existing-system integration

- Reuse Phase 1 Shield evidence and Phase 6 AI license policies.

## Testing requirements

- Licensed training, similar output without evidence, voice clone, dataset listing and jurisdiction tests.

## Exit criteria

- AI matters clearly state evidence limits.
- No AI license is inferred from ordinary Tourify terms.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.
