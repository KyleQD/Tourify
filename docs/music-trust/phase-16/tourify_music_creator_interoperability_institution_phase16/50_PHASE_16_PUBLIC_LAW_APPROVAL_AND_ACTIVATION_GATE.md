# Phase 16 Public-Law Approval and Activation Gate

## Purpose

Define the final default-deny gate for any limited Phase 16 production service.

## Phase boundary

Activation is scoped, time-limited, jurisdiction-specific and reversible.

## Non-negotiable integration boundary

- `artist_music` remains the canonical music catalog anchor. Phase 16 stores references, public-law records, approved projections and immutable source manifests; it does not create replacement catalog rows.
- Private audio remains in the existing `artist-music` bucket and playback continues through `/api/music/stream`, `resolveMusicAccess`, the existing Jukebox and current mobile playback paths.
- Rights Passports, licences, administration cases, royalty ledgers, federation decisions, constitutional compact records and official external records remain authoritative in their own domains.
- All Phase 16 capabilities use additive migrations, explicit RLS, restricted storage, feature and jurisdiction gates, append-only audit/outbox records and documented compensating actions.
- A public identifier, credential, treaty status record, registry projection or conformance certificate is never sufficient by itself to authorize a high-impact identity, rights, payment, membership, diplomatic or public-law action.

## Required records

- `phase16_activation_packages`
- `activation_decisions`
- `sunset_reviews`

Every record includes a stable identifier, lifecycle state, source manifest, policy and schema version, jurisdiction, effective period, actor authority, idempotency key, timestamps and audit event. Sensitive evidence is stored separately from public projections.

## Primary workflow

1. Collect evidence.
2. independent review.
3. public notice.
4. governing-body approval.
5. activate narrowly.
6. monitor.
7. suspend, sunset or renew.

## State and evidence model

Every durable workflow uses explicit states such as `draft`, `proposed`, `under_review`, `approved`, `effective`, `suspended`, `revoked`, `withdrawn`, `expired`, `superseded`, `rejected` and `archived`. Transitions are actor-scoped, idempotent, evidence-backed and versioned. Each action records the governing policy and schema version, jurisdiction, effective period, actor authority, source manifest, idempotency key and append-only audit event. Historical actions retain the rules under which they were taken.

## Authorization model

Authorization resolves the current actor, organization, participant class, jurisdiction, legal instrument, delegated scope, local reserved powers, suspensions, revocations and expiry at execution time. Cached credentials and public projections may assist discovery but cannot authorize the action. High-impact actions require current authoritative records, separation of duties, human review and an accessible appeal or correction path.

## Topic-specific controls

- Activation requires legal opinions, effective instruments, participant authority, host and funding readiness, independent oversight, security and accessibility approval, operator redundancy and rollback.
- Any privilege, treaty-registration, relationship or public authority feature is activated separately.
- No unresolved critical blocker is permitted.

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

## Minimum activation evidence

- effective legal basis for the exact service;
- competent participant authority;
- functioning organs and decision record;
- host, funding, procurement and staffing readiness;
- independent audit, ethics, investigation and remedy functions;
- privacy, security, accessibility, sanctions, export and competition approval;
- two independent implementations and operators;
- successful provider-replacement and Tourify-unavailable tests;
- public legal-character disclosure;
- scoped feature flag, jurisdiction list, sunset date, monitoring owner and rollback.

Activation is denied if any required privilege, relationship, registration or public-law status is merely proposed rather than effective.
