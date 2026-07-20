# Cooperative Data Vault, Custody and Access Model

## Purpose

Design segregated storage, encryption, key management, data-custody responsibilities and default-deny access for cooperative data.

## Primary workflows

1. Ingest approved extracts into restricted cooperative storage.
2. Encrypt data with environment and purpose separation.
3. Authorize service accounts through scoped jobs rather than direct analyst credentials.
4. Issue short-lived researcher access to approved outputs or clean-room sessions.
5. Log every read, export and administrative action.

## Required controls

- No shared bucket with artist masters, Rights Passport evidence or contracts.
- No production service-role key in researcher-facing applications.
- No raw export where an approved aggregate or query result can satisfy the research need.

## Primary records

- `phase9_data_vault_objects`
- `phase9_data_access_grants`
- `phase9_key_versions`
- `phase9_access_audit`
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
