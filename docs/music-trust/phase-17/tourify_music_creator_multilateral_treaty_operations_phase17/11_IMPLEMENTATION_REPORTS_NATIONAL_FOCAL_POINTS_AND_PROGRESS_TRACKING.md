# Implementation Reports, Focal Points and Progress Tracking

## Purpose

Coordinate participant reporting and implementation follow-up.

## Non-negotiable integration boundary

- `artist_music` remains the canonical upload and catalog anchor. Phase 17 records reference canonical music, rights, licence, royalty, administration, federation, commons, constitutional, convention and institutional sources; they never replace them.
- Private audio remains in the existing `artist-music` bucket. Playback continues through `/api/music/stream`, `resolveMusicAccess`, the current `JukeboxProvider`/`useJukebox` flow and existing mobile playback paths.
- Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, licensing, royalty and rights-administration behavior must remain green.
- Use additive migrations, explicit backfills, default-deny RLS, restricted storage, short-lived signed URLs, versioned records, feature and jurisdiction gates, append-only audit/outbox events and documented compensating actions. Never reset the database.
- Tourify remains an optional implementation and service provider. Treaty operations, review conferences, registries, public services, archives and institutional continuity must remain operable if Tourify exits, fails, changes ownership or stops providing services.
- No account, identifier, credential, observer role, advisory seat, prior-phase participation or public projection creates membership, treaty status, representation, ownership, licensing, collection, enforcement, payment, privilege, immunity, diplomatic or public regulatory authority.
- Public identifiers, credentials, registries and resolver responses may support discovery and verification but are never sufficient alone for a high-impact action. The current authoritative instrument, participant authority, governing-body decision, mandate, jurisdiction and source record must be checked at execution time.

## Required records

- `implementation_reports`
- `focal_point_designations`
- `progress_updates`
- `report_validation_findings`

Each record includes a stable identifier, lifecycle state, immutable source manifest, policy and schema version, jurisdiction, effective period, actor authority, idempotency key, timestamps and append-only audit event. Restricted evidence is separated from public projections.

## Primary workflow

1. Designate focal point.
2. Submit structured report.
3. Validate authority and evidence.
4. Publish approved summary.
5. Track recommendations and deadlines.

## Required design decisions

- Self-reports are not independently verified facts.
- Allow corrections and late submissions.
- Keep non-state implementation contributions distinct from state obligations.

## State and evidence model

Every durable workflow uses explicit states such as `draft`, `proposed`, `under_review`, `adopted`, `approved`, `effective`, `implementation_due`, `implemented`, `partially_implemented`, `non_compliant`, `suspended`, `revoked`, `withdrawn`, `expired`, `superseded`, `terminated`, `rejected` and `archived`. Transitions are actor-scoped, evidence-backed, idempotent, versioned and time-bounded where applicable. Each action records `policy_version`, `schema_version`, `jurisdiction`, `effective_at`, `expires_at`, `source_manifest_id`, `actor_authority_id`, `idempotency_key` and `audit_event_id`. Historical actions retain the rules under which they were taken.

## Authorization model

Authorization resolves the current actor, participant class, organization, jurisdiction, constitutive instrument, protocol or annex, delegated scope, local reserved powers, conflicts, suspensions, revocations and expiry at execution time. Cached credentials and public projections may assist discovery but cannot authorize the action. High-impact actions require current authoritative records, separation of duties, human review, accessible notice, appeal or correction and an explicit compensating action.

## Operational design

- Use dedicated routes under `app/api/creator-multilateral-treaty-operations/**` and shared helpers under `lib/music/creator-multilateral-treaty-operations/`, unless the repository audit proves an established compatible namespace should be extended.
- Use Next.js App Router route handlers, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and receive-object/return-object helpers.
- Execute external writes through outbox-backed workers with signatures where applicable, replay protection, idempotency, reconciliation, dead-letter handling and compensating actions.
- Separate restricted evidence from approved public projections. Public and verifier-facing routes read projection tables or security-invoker views, never confidential operational tables.
- Define queue ownership, escalation paths, response targets, incident ownership, continuity owners and public-communication duties before enabling production traffic.

## Mandatory stop conditions

Stop rather than degrade when legal character, competence, participant authority, membership, instrument status, source lineage, review mandate, amendment authority, host arrangement, privilege schedule, funding, appropriation, jurisdiction, privacy, security, accessibility, competition, procurement, staffing, relationship agreement, provider contract, independent review or public approval is missing, disputed, expired or stale. A review conference cannot enlarge institutional competence by ordinary software configuration, administrative guidance or implementation practice.

## Required verification

- Default-deny RLS and API authorization for states, international organizations, creator bodies, observers, delegates, secretariat staff, experts, reviewers, auditors, operators and workers.
- Idempotent retry, duplicate webhook, outbox replay, external reconciliation, expiry, suspension, revocation, withdrawal, supersession and compensating-action tests.
- Cross-organization isolation, local-sovereignty, jurisdiction, competence, protocol-version, reservation, host-country and privilege non-activation tests.
- Public-projection minimization, stale-source, disputed-source, re-identification, multilingual, accessibility, assisted-service and low-bandwidth tests.
- Key rotation, compromised operator, registry poisoning, malicious resolver, funder capture, provider failure, archive loss, network partition and Tourify-unavailable continuity exercises.
- Complete regression coverage for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.

## Completion evidence

Codex may mark this area complete only after recording audited repository paths, deployed objects, effective legal and institutional assumptions, files changed, commands run, migrations, generated types, RLS and route tests, worker tests, external reviews, operational owners, monitoring, rollback instructions and unresolved blockers in `phase-17-execution-plan.json`.
