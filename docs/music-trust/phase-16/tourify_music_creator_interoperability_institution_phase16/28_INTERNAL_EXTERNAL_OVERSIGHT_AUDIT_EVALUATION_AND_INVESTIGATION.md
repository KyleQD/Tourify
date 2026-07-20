# Internal and External Oversight, Audit, Evaluation and Investigation

## Purpose

Separate management from assurance, investigation and independent evaluation.

## Phase boundary

Oversight functions require independent mandates, access rights and protection from retaliation.

## Non-negotiable integration boundary

- `artist_music` remains the canonical music catalog anchor. Phase 16 stores references, public-law records, approved projections and immutable source manifests; it does not create replacement catalog rows.
- Private audio remains in the existing `artist-music` bucket and playback continues through `/api/music/stream`, `resolveMusicAccess`, the existing Jukebox and current mobile playback paths.
- Rights Passports, licences, administration cases, royalty ledgers, federation decisions, constitutional compact records and official external records remain authoritative in their own domains.
- All Phase 16 capabilities use additive migrations, explicit RLS, restricted storage, feature and jurisdiction gates, append-only audit/outbox records and documented compensating actions.
- A public identifier, credential, treaty status record, registry projection or conformance certificate is never sufficient by itself to authorize a high-impact identity, rights, payment, membership, diplomatic or public-law action.

## Required records

- `audit_plans`
- `audit_reports`
- `evaluations`
- `investigation_cases`
- `management_responses`

Every record includes a stable identifier, lifecycle state, source manifest, policy and schema version, jurisdiction, effective period, actor authority, idempotency key, timestamps and audit event. Sensitive evidence is stored separately from public projections.

## Primary workflow

1. Plan.
2. preserve independence.
3. collect evidence.
4. issue finding.
5. protect confidentiality.
6. receive management response.
7. track recommendation.
8. publish permitted summary.

## State and evidence model

Every durable workflow uses explicit states such as `draft`, `proposed`, `under_review`, `approved`, `effective`, `suspended`, `revoked`, `withdrawn`, `expired`, `superseded`, `rejected` and `archived`. Transitions are actor-scoped, idempotent, evidence-backed and versioned. Each action records the governing policy and schema version, jurisdiction, effective period, actor authority, source manifest, idempotency key and append-only audit event. Historical actions retain the rules under which they were taken.

## Authorization model

Authorization resolves the current actor, organization, participant class, jurisdiction, legal instrument, delegated scope, local reserved powers, suspensions, revocations and expiry at execution time. Cached credentials and public projections may assist discovery but cannot authorize the action. High-impact actions require current authoritative records, separation of duties, human review and an accessible appeal or correction path.

## Operational design

- Use a dedicated namespace under `app/api/creator-interoperability-institution/**` and shared helpers under `lib/music/creator-interoperability-institution/`.
- Use colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and receive-object/return-object helpers.
- Execute external writes through an outbox-backed worker with signed requests where applicable, replay protection, reconciliation and compensating actions.
- Define queue ownership, escalation paths, response targets, public communications duties and a tested service-continuity owner before production traffic.

## Mandatory stop conditions

Stop rather than degrade when legal character, competent authority, membership, source lineage, constitutive basis, protocol status, host arrangement, privilege schedule, appropriation, jurisdiction, privacy, security, accessibility, competition, procurement, staffing, provider contract, independent review or public approval is missing, disputed, expired or stale. Missing evidence is recorded as a blocker and is never hidden as an implementation TODO.

## Required verification

- Default-deny RLS and API authorization for participants, states, international organizations, non-state bodies, delegates, secretariat staff, reviewers, auditors, operators and workers.
- Idempotent retry, duplicate webhook, outbox replay, external reconciliation, suspension, revocation and compensating-action tests.
- Cross-organization isolation, local-sovereignty, jurisdiction, expiry, host-country and privilege non-activation tests.
- Public-projection minimization, stale-source, disputed-source, multilingual, accessibility, low-bandwidth and re-identification tests.
- Key rotation, compromised operator, registry poisoning, malicious resolver, funder capture, provider failure and Tourify-unavailable continuity exercises.
- Complete regressions for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.

## Completion evidence

Codex may mark this area complete only after recording the audited repository paths, deployed objects, current legal and provider assumptions, files changed, commands run, migrations, generated types, RLS and route tests, external reviews, operational owner, monitoring, rollback instructions and unresolved blockers in `phase-16-execution-plan.json`.
