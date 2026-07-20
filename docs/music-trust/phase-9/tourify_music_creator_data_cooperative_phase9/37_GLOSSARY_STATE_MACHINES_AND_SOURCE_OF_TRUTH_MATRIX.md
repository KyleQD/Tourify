# Glossary, State Machines and Source-of-Truth Matrix

## Purpose

Define canonical terminology, lifecycle states, authorities and ownership of records.

## Primary workflows

1. Define membership, contribution, research, publication, policy, standards and collective-readiness states.
2. Map official source versus Tourify mirror.
3. Define compensating transitions and immutable history.
4. Prevent ambiguous terms such as anonymous, cooperative-owned, represented or approved.

## Required controls

- No state is inferred from unrelated status fields.
- No status silently skips required approval.
- Every terminal state preserves history.

## Primary records

- glossary and matrices
## Canonical source-of-truth rules

- `artist_music` remains the catalog anchor; Phase 9 stores references and approved extracts, not replacement catalog rows.
- Rights Passports, Phase 6 licences and Phase 7 administration/enforcement records remain immutable source evidence.
- Phase 8 consent, privacy and benchmark decisions are inputs, but cooperative membership and data contribution require new, separately executed records.
- External research institutions, regulators, standards bodies, CMOs, courts and government registries remain authoritative for their own decisions and filings.
- Every derived dataset, analysis, publication and benefit allocation points to an immutable input manifest and policy version.

## Stop conditions

Stop the workflow when any of the following is true:

- membership, contribution licence, consent, authority or permitted purpose is missing or expired;
- the source dataset cannot be reproduced from an approved lineage manifest;
- the cohort fails minimum-size, independence, concentration, delay or re-identification controls;
- the request would expose current or future competitive strategy, prices, bids, rates or contract positions;
- research ethics, privacy, security, export, IP, competition or jurisdiction review is incomplete;
- an output could be interpreted as legal, tax, investment or coordinated pricing advice;
- the board, member vote, independent committee or outside authority required by policy has not approved the action;
- a member withdrawal, legal hold, regulator request or incident requires processing to pause.

## Existing-system integration

- Consume approved, versioned extracts through adapters or event outboxes; never query confidential operational tables directly from public or researcher-facing routes.
- Do not modify upload, stream, entitlement, player, feed, profile, EPK, marketplace, licensing, rights-administration, royalty or mobile behavior.
- Keep Phase 9 routes under a dedicated namespace and behind feature, jurisdiction and entity-readiness flags.
- Use route handlers under `app/api/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, additive migrations and explicit RLS.
- Use restricted storage, short-lived signed URLs, access logs and output review for all cooperative and research files.

## Required tests

- membership versus ordinary Tourify-account separation;
- purpose-specific contribution and revocation behavior;
- RLS for members, directors, committee reviewers, researchers, administrators and workers;
- small-cohort, concentration, stale-source and re-identification stop conditions;
- default-deny research access and output release;
- competition-sensitive content detection and escalation;
- idempotent external submissions and compensating rollback;
- regression coverage for upload, playback, entitlement, marketplace, feed, profile, EPK, analytics and mobile.

## Completion evidence

Codex may mark this area complete only after it records:

1. audited repository paths and deployed database objects;
2. approved legal/entity/governance assumptions and named operational owners;
3. migrations, generated types, RLS tests and route tests;
4. privacy, ethics, competition, security and jurisdiction review evidence;
5. feature flags, stop conditions, monitoring and rollback instructions; and
6. task-level files changed, commands run, test results and unresolved blockers in `phase-9-execution-plan.json`.

## Canonical state machines

### Membership

`draft → applied → under_review → approved → active → suspended → withdrawn | expelled | deceased`

### Data contribution licence

`draft → presented → accepted → active → partially_suspended → revoked | expired`

### Research project

`concept → application → diligence → ethics_review → privacy_review → competition_review → approved → licensed → active → output_review → published → closed | terminated`

### Benchmark or research output

`draft → reproducibility_check → privacy_review → competition_review → editorial_review → approved → published → corrected | withdrawn`

### Standards proposal

`idea → member_consultation → IPR_review → board_approval → submitted → discussed → accepted | rejected | withdrawn | superseded`

### Collective entity readiness

`concept → legal_analysis → entity_formed → governance_ready → mandates_pending → technical_readiness → separately_approved → active`

Phase 9 may not transition this state beyond `technical_readiness`.

## Source-of-truth matrix

| Record | Official source | Tourify/Phase 9 role | May Phase 9 modify official source? |
|---|---|---|---|
| Music asset | `artist_music` and private storage | Reference only | No |
| Rights ownership | Rights Passport + agreements + external registries | Versioned evidence reference | No |
| Administration/claim status | Phase 7 and external provider | Approved aggregate input | No |
| Phase 8 consent | Phase 8 consent ledger | Eligibility input | No |
| Cooperative membership | Separate entity membership ledger | Operational system for approved entity | Only through governed membership workflow |
| Data contribution | Executed contribution licence | Canonical Phase 9 permission | Only through member/licensor action |
| Research ethics decision | IRB/ethics body | Versioned mirror and evidence | No |
| Publication | Approved publication registry | Canonical Phase 9 output record | Through correction/withdrawal workflow |
| Standards status | Standards organization | Versioned mirror | No |
| Collective authority | Separate entity and mandates | Readiness record only | No production authority in Phase 9 |
